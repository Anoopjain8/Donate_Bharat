const storage = require('../services/storage');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function decodeKey(req) {
  const key = req.params[0];
  if (!key) throw ApiError.badRequest('Missing file key');
  return decodeURIComponent(key);
}

async function resolveAccessibleKeys(user) {
  const keys = new Set();

  const bills = await Bill.find({ payer: user._id }).select('files').lean();
  bills.forEach((b) => b.files.forEach((f) => keys.add(f.key)));

  if (user.role === 'payee') {
    const org = await Organization.findOne({ owner: user._id }).select('_id').lean();
    if (org) {
      const orgBills = await Bill.find({ organization: org._id }).select('files').lean();
      orgBills.forEach((b) => b.files.forEach((f) => keys.add(f.key)));
    }
  }

  const payments = await Payment.find({ payer: user._id }).select('receiptPdf').lean();
  payments.forEach((p) => p.receiptPdf && keys.add(p.receiptPdf));

  return keys;
}

/**
 * GET /api/files/* — proxies a stored file to the browser.
 * Access is authorized by checking the file key belongs to the user's data.
 */
const getFile = asyncHandler(async (req, res) => {
  const key = decodeKey(req);
  const user = req.user;

  const accessible = await resolveAccessibleKeys(user);
  const isOrgLogo = /^orgs\//.test(key);

  if (!accessible.has(key) && !isOrgLogo && user.role !== 'admin') {
    throw ApiError.forbidden('You do not have access to this file');
  }

  const { stream, mime } = await storage.getStream(key);
  const download = req.query.disposition === 'attachment';

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(404).json({ success: false, message: 'File not found' });
    }
  });
  stream.pipe(res);
});

module.exports = { getFile };
