const User = require('../models/User');
const Organization = require('../models/Organization');
const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../utils/audit');

/**
 * GET /api/admin/overview — platform KPIs.
 */
const getOverview = asyncHandler(async (req, res) => {
  const [userCount, orgCount, pendingOrgs, paymentStats, billCount, monthRevenue] = await Promise.all([
    User.countDocuments(),
    Organization.countDocuments(),
    Organization.countDocuments({ verified: false }),
    Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Bill.countDocuments(),
    Payment.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    overview: {
      users: userCount,
      organizations: orgCount,
      pendingOrganizations: pendingOrgs,
      completedPayments: paymentStats[0]?.count || 0,
      totalProcessed: paymentStats[0]?.total || 0,
      bills: billCount,
      last30DaysRevenue: monthRevenue[0]?.total || 0,
    },
  });
});

/**
 * GET /api/admin/organizations?status=pending|all
 */
const listOrganizations = asyncHandler(async (req, res) => {
  const { status = 'all', page = 1, limit = 20, q } = req.query;
  const query = {};
  if (status === 'pending') query.verified = false;
  if (status === 'verified') query.verified = true;
  if (q) query.name = { $regex: q, $options: 'i' };

  const [orgs, total] = await Promise.all([
    Organization.find(query)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Math.min(50, Number(limit))),
    Organization.countDocuments(query),
  ]);

  res.json({
    success: true,
    organizations: orgs,
    pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * PATCH /api/admin/organizations/:id/verify
 */
const verifyOrganization = asyncHandler(async (req, res) => {
  const { verified } = req.body;
  const org = await Organization.findById(req.params.id);
  if (!org) throw ApiError.notFound('Organization not found');

  org.verified = Boolean(verified);
  org.verifiedAt = verified ? new Date() : undefined;
  org.verifiedBy = req.user._id;
  await org.save();

  const owner = await User.findById(org.owner);
  if (owner && verified) {
    owner.role = 'payee';
    await owner.save();
  }

  logAudit({
    actor: req.user._id,
    action: verified ? 'org.verify' : 'org.unverify',
    resource: 'Organization',
    resourceId: org._id,
    req,
  });
  res.json({ success: true, organization: org.toSafeJSON() });
});

/**
 * GET /api/admin/users
 */
const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, q } = req.query;
  const query = {};
  if (role) query.role = role;
  if (q) query.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];

  const [users, total] = await Promise.all([
    User.find(query).select('name email role isActive createdAt lastLoginAt').sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Math.min(50, Number(limit))),
    User.countDocuments(query),
  ]);

  res.json({ success: true, users, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } });
});

/**
 * PATCH /api/admin/users/:id/status — activate/deactivate.
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin') throw ApiError.badRequest('Cannot disable an admin account');

  user.isActive = Boolean(isActive);
  await user.save();
  logAudit({ actor: req.user._id, action: `user.${user.isActive ? 'activate' : 'deactivate'}`, resource: 'User', resourceId: user._id, req });
  res.json({ success: true, user: user.toSafeJSON() });
});

/**
 * GET /api/admin/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ createdAt: 1 });
  res.json({ success: true, categories });
});

/**
 * POST /api/admin/categories
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, subTypes, departmentSuggestions, icon, description } = req.body;
  const category = await Category.create({ name, subTypes: subTypes || [], departmentSuggestions: departmentSuggestions || [], icon: icon || '', description: description || '' });
  logAudit({ actor: req.user._id, action: 'category.create', resource: 'Category', resourceId: category._id, req });
  res.status(201).json({ success: true, category });
});

/**
 * PATCH /api/admin/categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  Object.assign(category, req.body);
  await category.save();
  logAudit({ actor: req.user._id, action: 'category.update', resource: 'Category', resourceId: category._id, req });
  res.json({ success: true, category });
});

/**
 * GET /api/admin/audit-logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const [logs, total] = await Promise.all([
    require('../models/AuditLog').find()
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Math.min(100, Number(limit))),
    require('../models/AuditLog').countDocuments(),
  ]);
  res.json({ success: true, logs, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } });
});

module.exports = {
  getOverview,
  listOrganizations,
  verifyOrganization,
  listUsers,
  toggleUserStatus,
  getCategories,
  createCategory,
  updateCategory,
  getAuditLogs,
};
