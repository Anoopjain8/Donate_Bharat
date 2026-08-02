const Bill = require('../models/Bill');
const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const storage = require('../services/storage');
const { logAudit } = require('../utils/audit');

function safePagination(page, limit) {
  return {
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 12)),
  };
}

/**
 * POST /api/bills — upload one or more bill files (PDF/image) with metadata.
 */
const createBill = asyncHandler(async (req, res) => {
  const { category, subType, department, religion, type: orgType, amount, date, referenceNumber, paymentGateway, payeeLocation, notes, organizationId, organizationName } = req.body;

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    throw ApiError.badRequest('A valid non-negative amount is required');
  }
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('At least one bill file (PDF or image) is required');
  }

  const files = [];
  for (const f of req.files) {
    const up = await storage.upload({
      buffer: f.buffer,
      originalName: f.originalname,
      mime: f.mimetype,
      folder: 'bills',
      kind: 'all',
    });
    files.push(up);
  }

  let org = null;
  if (organizationId) {
    org = await Organization.findOne({ _id: organizationId, verified: true }).catch(() => null);
  }

  const bill = await Bill.create({
    payer: req.user._id,
    organization: org ? org._id : undefined,
    organizationName: organizationName || (org ? org.name : ''),
    category,
    subType: subType || '',
    department: department || '',
    religion: religion || '',
    type: orgType || '',
    amount: amountNum,
    date: date || new Date(),
    referenceNumber: referenceNumber || '',
    paymentGateway: paymentGateway || '',
    payeeLocation: payeeLocation || '',
    notes: notes || '',
    files,
    status: 'pending',
  });

  logAudit({ actor: req.user._id, action: 'bill.create', resource: 'Bill', resourceId: bill._id, req });
  res.status(201).json({ success: true, bill });
});

/**
 * GET /api/bills/mine — the payer's bills, filterable.
 */
const getMyBills = asyncHandler(async (req, res) => {
  const { page: p, limit: l, category, status, from, to, q } = req.query;
  const { page, limit } = safePagination(p, l);
  const query = { payer: req.user._id };

  if (category) query.category = category;
  if (status) query.status = status;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }
  if (q) {
    query.$or = [
      { organizationName: { $regex: q, $options: 'i' } },
      { referenceNumber: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
      { notes: { $regex: q, $options: 'i' } },
    ];
  }

  const [bills, total] = await Promise.all([
    Bill.find(query).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Bill.countDocuments(query),
  ]);

  res.json({
    success: true,
    bills,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/bills/summary — category / month breakdown for the payer.
 */
const getSummary = asyncHandler(async (req, res) => {
  const [byCategory, byMonth, totals] = await Promise.all([
    Bill.aggregate([
      { $match: { payer: req.user._id } },
      { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Bill.aggregate([
      { $match: { payer: req.user._id } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Bill.aggregate([
      { $match: { payer: req.user._id } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    byCategory,
    byMonth,
    totals: totals[0] || { count: 0, total: 0 },
  });
});

/**
 * GET /api/bills/:id — single bill (owner or related org only).
 */
const getBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) throw ApiError.notFound('Bill not found');

  const isOwner = bill.payer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  let isOrg = false;
  if (bill.organization) {
    const org = await Organization.findById(bill.organization);
    isOrg = !!org && org.owner.toString() === req.user._id.toString();
  }

  if (!isOwner && !isAdmin && !isOrg) throw ApiError.forbidden('Not allowed to view this bill');

  const files = await Promise.all(
    bill.files.map(async (f) => ({
      ...f.toObject(),
      url: await storage.getFileUrl(f.key),
    }))
  );

  res.json({ success: true, bill: { ...bill.toObject(), files } });
});

/**
 * DELETE /api/bills/:id — payer deletes their own bill.
 */
const deleteBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, payer: req.user._id });
  if (!bill) throw ApiError.notFound('Bill not found');

  await Promise.all(bill.files.map((f) => storage.remove(f.key)));
  await bill.deleteOne();
  logAudit({ actor: req.user._id, action: 'bill.delete', resource: 'Bill', resourceId: req.params.id, req });
  res.json({ success: true, message: 'Bill deleted' });
});

/**
 * GET /api/bills/org — bills received by the payee's organization.
 */
const getOrgBills = asyncHandler(async (req, res) => {
  const org = await Organization.findOne({ owner: req.user._id });
  if (!org) throw ApiError.notFound('Organization profile not found');

  const { page: p, limit: l, status, from, to } = req.query;
  const { page, limit } = safePagination(p, l);
  const query = { organization: org._id };
  if (status) query.status = status;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  const [bills, total, counts] = await Promise.all([
    Bill.find(query).populate('payer', 'name email').sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
    Bill.countDocuments(query),
    Bill.aggregate([
      { $match: { organization: org._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const pendingCount = counts.find((c) => c._id === 'pending')?.count || 0;
  const approvedCount = counts.find((c) => c._id === 'approved')?.count || 0;
  const rejectedCount = counts.find((c) => c._id === 'rejected')?.count || 0;

  res.json({
    success: true,
    bills,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    pendingCount,
    approvedCount,
    rejectedCount,
  });
});

/**
 * PUT /api/bills/:id/review — payee org approves/rejects a bill.
 */
const reviewBill = asyncHandler(async (req, res) => {
  const { status, reviewNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw ApiError.badRequest('Status must be approved or rejected');
  }

  const bill = await Bill.findById(req.params.id);
  if (!bill) throw ApiError.notFound('Bill not found');

  const org = await Organization.findOne({ owner: req.user._id });
  if (!org || !bill.organization || bill.organization.toString() !== org._id.toString()) {
    throw ApiError.forbidden('This bill does not belong to your organization');
  }

  bill.status = status;
  bill.reviewNote = reviewNote || '';
  bill.reviewedAt = new Date();
  bill.reviewedBy = req.user._id;
  await bill.save();

  logAudit({ actor: req.user._id, action: `bill.review.${status}`, resource: 'Bill', resourceId: bill._id, req });
  res.json({ success: true, bill });
});

/**
 * GET /api/bills/export — CSV export of the payer's bills (date filtered).
 */
const exportMyBillsCsv = asyncHandler(async (req, res) => {
  const { from, to, category } = req.query;
  const query = { payer: req.user._id };
  if (category) query.category = category;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  const bills = await Bill.find(query).sort({ date: -1 });
  const { buildRow } = require('../services/report');

  const header = Object.keys(buildRow({}, 'bills'));
  const lines = [
    header.join(','),
    ...bills.map((b) => {
      const row = buildRow({ ...b.toObject(), payer: { name: req.user.name, email: req.user.email } }, 'bills');
      return header.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',');
    }),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bills-${Date.now()}.csv"`);
  res.send(lines.join('\n'));
});

module.exports = {
  createBill,
  getMyBills,
  getSummary,
  getBill,
  deleteBill,
  getOrgBills,
  reviewBill,
  exportMyBillsCsv,
};
