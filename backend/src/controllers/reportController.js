const crypto = require('crypto');
const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Organization = require('../models/Organization');
const ReportShare = require('../models/ReportShare');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildExcel, buildPdf } = require('../services/report');
const { logAudit } = require('../utils/audit');
const env = require('../config/env');

const REPORT_TTL_DAYS = 7;

function parseRange(from, to) {
  const q = { $gte: new Date(from || new Date(0)), $lte: new Date(to || new Date(8640000000000000)) };
  if (q.$lte.getTime() === q.$gte.getTime()) q.$lte = new Date(q.$gte.getTime() + 24 * 60 * 60 * 1000 - 1);
  return q;
}

function buildQuery(type, range, org, user) {
  if (type === 'payments') {
    return org
      ? { organization: org._id, completedAt: range, status: 'completed' }
      : { payer: user._id, completedAt: range, status: 'completed' };
  }
  return org
    ? { organization: org._id, date: range }
    : { payer: user._id, date: range };
}

async function hydrate(items) {
  const payerIds = [...new Set(items.map((i) => i.payer).filter(Boolean).map((p) => String(p)))];
  const users = payerIds.length ? await require('../models/User').find({ _id: { $in: payerIds } }) : [];
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  return items.map((i) => ({
    ...i,
    payer: i.payer && userMap.get(String(i.payer))
      ? { name: userMap.get(String(i.payer)).name, email: userMap.get(String(i.payer)).email }
      : i.payer,
  }));
}

function reportTitle(type, range, org) {
  const scope = org ? org.name : 'My';
  return `${scope} ${type === 'payments' ? 'Payment' : 'Bill'} Report`;
}

/**
 * Loads the report data scoped to the requesting user's access level.
 */
async function loadReportData(req, { type, from, to }) {
  const range = parseRange(from, to);
  const Model = type === 'payments' ? Payment : Bill;
  const org = req.user.role === 'payee'
    ? await Organization.findOne({ owner: req.user._id })
    : null;
  const items = await Model.find(buildQuery(type, range, org, req.user)).lean();
  return { range, org, items };
}

/**
 * GET /api/reports/export?type=payments|bills&from=&to=&format=xlsx|pdf
 * Authenticated: exporter owns the data (payer) or their own org (payee).
 */
const exportReport = asyncHandler(async (req, res) => {
  const { type = 'payments', from, to, format = 'xlsx' } = req.query;
  if (!['payments', 'bills'].includes(type)) throw ApiError.badRequest('Invalid report type');
  if (!['xlsx', 'pdf', 'csv'].includes(format)) throw ApiError.badRequest('Invalid format');

  const { range, org, items } = await loadReportData(req, { type, from, to });
  const hydrated = await hydrate(items);

  const title = reportTitle(type, range, org);
  const filename = `${type}-report-${Date.now()}`;

  if (format === 'pdf') {
    const buf = await buildPdf(hydrated, type, { title, from: range.$gte, to: range.$lte, generatedBy: req.user.email });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    return res.send(buf);
  }

  if (format === 'csv') {
    const { buildRow, csvSafe } = require('../services/report');
    const header = Object.keys(buildRow({}, type));
    const lines = [
      header.join(','),
      ...hydrated.map((i) => {
        const row = buildRow(i, type);
        return header.map((h) => `"${csvSafe(row[h] ?? '')}"`).join(',');
      }),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(lines.join('\n'));
  }

  const buf = await buildExcel(hydrated, type, { title, from: range.$gte, to: range.$lte, generatedBy: req.user.email });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.send(buf);
});

/**
 * POST /api/reports/share — create a time-limited public share link.
 * The token is random; the link resolves to a public, read-only snapshot.
 */
const shareReport = asyncHandler(async (req, res) => {
  const { type = 'payments', from, to } = req.body;
  if (!['payments', 'bills'].includes(type)) throw ApiError.badRequest('Invalid report type');

  const { range, org, items } = await loadReportData(req, { type, from, to });
  const hydrated = await hydrate(items);

  const share = await ReportShare.create({
    owner: req.user._id,
    type,
    scope: org ? org._id : req.user._id,
    from: range.$gte,
    to: range.$lte,
    token: crypto.randomBytes(24).toString('hex'),
    expiresAt: new Date(Date.now() + REPORT_TTL_DAYS * 24 * 60 * 60 * 1000),
    title: reportTitle(type, range, org),
    snapshot: hydrated.map((i) => require('../services/report').buildRow(i, type)),
  });

  const url = `${env.clientOrigin[0]}/shared/${share.token}`;
  logAudit({ actor: req.user._id, action: 'report.share', resource: 'ReportShare', resourceId: share._id, req });
  res.status(201).json({ success: true, share, url });
});

/**
 * GET /api/reports/shared/:token — public read of a shared report snapshot.
 */
const getSharedReport = asyncHandler(async (req, res) => {
  const share = await ReportShare.findOne({ token: req.params.token });
  if (!share || share.expiresAt < new Date()) {
    throw ApiError.notFound('Share link not found or expired');
  }
  res.json({
    success: true,
    report: {
      title: share.title,
      type: share.type,
      from: share.from,
      to: share.to,
      createdAt: share.createdAt,
      rows: share.snapshot,
    },
  });
});

module.exports = { exportReport, shareReport, getSharedReport };
