const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const storage = require('../services/storage');
const { logAudit } = require('../utils/audit');

const ORG_FIELDS = [
  'name', 'religion', 'type', 'description', 'address', 'registrationNo',
  'panNumber', 'website', 'email', 'phone',
];

function pickOrgFields(body) {
  const out = {};
  for (const f of ORG_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  return out;
}

function safePagination(page, limit) {
  return {
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 12)),
  };
}

/**
 * GET /api/organizations — public browse (verified only).
 */
const listOrganizations = asyncHandler(async (req, res) => {
  const { religion, type, search, page: p, limit: l } = req.query;
  const { page, limit } = safePagination(p, l);
  const query = { verified: true };

  if (religion) query.religion = religion;
  if (type) query.type = type;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [total, items] = await Promise.all([
    Organization.countDocuments(query),
    Organization.find(query)
      .sort({ totalReceived: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    success: true,
    organizations: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/organizations/:id — public detail.
 */
const getOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) throw ApiError.notFound('Organization not found');
  if (!org.verified && !(req.user && (req.user.role === 'admin' || req.user._id.equals(org.owner)))) {
    throw ApiError.notFound('Organization not found');
  }
  res.json({ success: true, organization: org.toSafeJSON() });
});

/**
 * GET /api/organizations/mine — the current payee user's own profile.
 */
const getMyOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findOne({ owner: req.user._id });
  if (!org) throw ApiError.notFound('You have not created an organization profile yet');
  res.json({ success: true, organization: org.toSafeJSON() });
});

/**
 * POST /api/organizations — create (payee). Pending admin verification.
 */
const createOrganization = asyncHandler(async (req, res) => {
  if (req.user.role !== 'payee') {
    throw ApiError.forbidden('Only payee accounts can create an organization profile');
  }
  if (!req.user.isEmailVerified) {
    throw ApiError.forbidden('Verify your email address before creating an organization profile');
  }
  const existing = await Organization.findOne({ owner: req.user._id });
  if (existing) throw ApiError.conflict('You already have an organization profile');

  const data = pickOrgFields(req.body);
  let logo = '';
  if (req.file) {
    const up = await storage.upload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      folder: 'orgs',
      kind: 'images',
    });
    logo = up.key;
  }

  const org = await Organization.create({ ...data, owner: req.user._id, logo });
  logAudit({ actor: req.user._id, action: 'org.create', resource: 'Organization', resourceId: org._id, req });
  res.status(201).json({ success: true, organization: org.toSafeJSON() });
});

/**
 * PUT /api/organizations/mine — update own profile.
 */
const updateMyOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findOne({ owner: req.user._id });
  if (!org) throw ApiError.notFound('Organization profile not found');

  Object.assign(org, pickOrgFields(req.body));

  if (req.file) {
    const up = await storage.upload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      folder: 'orgs',
      kind: 'images',
    });
    if (org.logo) storage.remove(org.logo);
    org.logo = up.key;
  }

  // Re-verify on meaningful changes.
  if (dataChanged(org, req.body)) {
    org.verified = false;
    org.verifiedAt = undefined;
    org.verifiedBy = undefined;
  }

  await org.save();
  logAudit({ actor: req.user._id, action: 'org.update', resource: 'Organization', resourceId: org._id, req });
  res.json({ success: true, organization: org.toSafeJSON() });
});

function dataChanged(org, body) {
  return ['name', 'religion', 'type', 'registrationNo', 'panNumber'].some(
    (f) => body[f] !== undefined && body[f] !== org[f]
  );
}

module.exports = {
  listOrganizations,
  getOrganization,
  getMyOrganization,
  createOrganization,
  updateMyOrganization,
};
