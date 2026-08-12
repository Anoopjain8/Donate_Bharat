const storage = require('../services/storage');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const path = require('path');

function decodeKey(req) {
  const key = req.params[0];
  if (!key) throw ApiError.badRequest('Missing file key');
  return decodeURIComponent(key);
}

async function resolveAccessible(user) {
  const keys = new Set();
  const names = new Map();

  const bills = await Bill.find({ payer: user._id }).select('files').lean();
  bills.forEach((b) => b.files.forEach((f) => {
    keys.add(f.key);
    names.set(f.key, f.name);
  }));

  if (user.role === 'payee') {
    const org = await Organization.findOne({ owner: user._id }).select('_id').lean();
    if (org) {
      const orgBills = await Bill.find({ organization: org._id }).select('files').lean();
      orgBills.forEach((b) => b.files.forEach((f) => {
        keys.add(f.key);
        names.set(f.key, f.name);
      }));
    }
  }

  const payments = await Payment.find({ payer: user._id }).select('receiptPdf receiptNumber').lean();
  payments.forEach((p) => {
    if (p.receiptPdf) {
      keys.add(p.receiptPdf);
      names.set(p.receiptPdf, p.receiptNumber ? `receipt-${p.receiptNumber}.pdf` : path.basename(p.receiptPdf));
    }
  });

  return { keys, names };
}

/**
 * GET /api/files/* — proxies a stored file to the browser.
 * Access is authorized by checking the file key belongs to the user's data.
 * `?disposition=attachment` streams the file as a download with its
 * original uploaded filename; otherwise it is served inline.
 */
const getFile = asyncHandler(async (req, res) => {
  const key = decodeKey(req);
  const user = req.user;

  const { keys, names } = await resolveAccessible(user);
  const isOrgLogo = /^orgs\//.test(key);

  if (!keys.has(key) && !isOrgLogo && user.role !== 'admin') {
    throw ApiError.forbidden('You do not have access to this file');
  }

  const { stream, mime } = await storage.getStream(key);
  const download = req.query.disposition === 'attachment';
  const originalName = (names.get(key) || path.basename(key)).replace(/"/g, '');

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', download
    ? `attachment; filename="${originalName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
    : 'inline');
  res.setHeader('Cache-Control', 'private, max-age=300');
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(404).json({ success: false, message: 'File not found' });
    }
  });
  stream.pipe(res);
});

module.exports = { getFile };
