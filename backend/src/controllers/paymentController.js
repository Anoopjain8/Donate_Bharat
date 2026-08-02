const Payment = require('../models/Payment');
const Organization = require('../models/Organization');
const Bill = require('../models/Bill');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const razorpay = require('../services/razorpay');
const storage = require('../services/storage');
const { buildReceiptPdf } = require('../services/receiptPdf');
const { logAudit } = require('../utils/audit');
const { sendEmail } = require('../services/email');

function nextReceiptNumber() {
  return `DB-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
}

/**
 * POST /api/payments/orders — create a Razorpay order for a payer.
 * Amount is bound server-side (min/max) to prevent client tampering.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { organizationId, amount, purpose, paymentMode } = req.body;

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < 1 || amountNum > 1000000) {
    throw ApiError.badRequest('Amount must be between ₹1 and ₹10,00,000');
  }

  const org = await Organization.findOne({ _id: organizationId, verified: true });
  if (!org) throw ApiError.notFound('Organization not found or not verified');

  const order = await razorpay.createOrder({
    amount: amountNum,
    receipt: nextReceiptNumber(),
    notes: { purpose: purpose || '', payerId: req.user._id.toString(), organizationId: org._id.toString() },
  });

  if (!order) {
    // Demo mode: fall back to a simulated order so the flow is testable end-to-end.
    return res.json({
      success: true,
      demo: true,
      order: {
        id: `order_demo_${Date.now()}`,
        amount: Math.round(amountNum * 100),
        currency: 'INR',
        receipt: nextReceiptNumber(),
      },
    });
  }

  const payment = await Payment.create({
    payer: req.user._id,
    organization: org._id,
    organizationName: org.name,
    amount: amountNum,
    purpose: purpose || '',
    paymentMode: paymentMode || 'UPI',
    method: 'online',
    status: 'pending',
    razorpayOrderId: order.id,
    metadata: { note: purpose || '' },
  });

  res.json({
    success: true,
    order,
    paymentId: payment._id,
    keyId: razorpay.getClient().key_id,
    organization: org.toSafeJSON(),
  });
});

/**
 * POST /api/payments/verify — verify a completed Razorpay payment.
 * Signature is ALWAYS verified when Razorpay is configured; ownership is
 * enforced by loading the payment scoped to the requesting payer.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId, razorpayPaymentId, razorpaySignature, razorpayOrderId } = req.body;

  const payment = await Payment.findOne({ _id: paymentId, payer: req.user._id });
  if (!payment) throw ApiError.notFound('Payment not found');

  if (payment.status === 'completed') {
    return res.json({ success: true, message: 'Payment already verified', payment });
  }

  const configured = razorpay.isConfigured();
  if (configured) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw ApiError.badRequest('Missing Razorpay verification data');
    }
    if (razorpayOrderId !== payment.razorpayOrderId) {
      throw ApiError.badRequest('Order mismatch');
    }
    if (!razorpay.verifySignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature })) {
      throw ApiError.badRequest('Invalid payment signature');
    }
  } else if (payment.status !== 'pending') {
    throw ApiError.badRequest('Payment is not in a verifiable state');
  }

  // Belt-and-braces: re-fetch from Razorpay to confirm the payment actually succeeded.
  if (configured) {
    const rp = await razorpay.fetchPayment(razorpayPaymentId);
    if (!rp || rp.status !== 'captured') {
      throw ApiError.badRequest('Payment has not been captured by the gateway');
    }
  }

  payment.status = 'completed';
  payment.razorpayPaymentId = razorpayPaymentId || payment.razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature || payment.razorpaySignature;
  payment.completedAt = new Date();
  payment.receiptNumber = payment.receiptNumber || nextReceiptNumber();
  await payment.save();

  await Organization.findByIdAndUpdate(payment.organization, { $inc: { totalReceived: payment.amount } });

  const org = await Organization.findById(payment.organization);
  const payer = req.user;

  // Auto-generate the PDF receipt and persist as a verified bill.
  const pdfBuffer = await buildReceiptPdf({
    receipt: payment,
    payer,
    organization: org,
    files: [],
  });
  const up = await storage.upload({
    buffer: pdfBuffer,
    originalName: `receipt-${payment.receiptNumber}.pdf`,
    mime: 'application/pdf',
    folder: 'receipts',
    kind: 'pdf',
  });

  payment.receiptPdf = up.key;
  await payment.save();

  const bill = await Bill.create({
    payer: payer._id,
    organization: org._id,
    organizationName: org.name,
    category: 'Religious Donation',
    amount: payment.amount,
    date: payment.completedAt,
    status: 'approved',
    autoGenerated: true,
    sourcePayment: payment._id,
    referenceNumber: payment.receiptNumber,
  });
  payment.bill = bill._id;
  await payment.save();

  logAudit({ actor: payer._id, action: 'payment.verify', resource: 'Payment', resourceId: payment._id, req });

  const receiptUrl = await storage.getFileUrl(payment.receiptPdf, { download: true });
  await sendEmail({
    to: payer.email,
    subject: `Receipt ${payment.receiptNumber} for your payment to ${org.name}`,
    text: `Thank you for your payment of ₹${payment.amount} to ${org.name}. Receipt: ${payment.receiptNumber}`,
    html: `<p>Thank you for your payment of <b>₹${payment.amount}</b> to <b>${org.name}</b>.</p><p>Your digital receipt is available in your dashboard.</p>`,
  });

  res.json({
    success: true,
    payment: payment.toObject(),
    receiptUrl,
    billId: bill._id,
  });
});

/**
 * POST /api/payments/webhook — Razorpay server-to-server webhook.
 * The only endpoint that marks a payment completed without user interaction.
 */
const webhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');

  // With express.raw() the body is a Buffer; without it, a parsed object.
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body));

  if (!razorpay.verifyWebhook(rawBody, signature)) {
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
  const event = body.event;
  if (event === 'payment.captured') {
    const rp = req.body.payload?.payment?.entity;
    const orderId = rp?.order_id;
    if (orderId) {
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment && payment.status === 'pending') {
        const paidPaise = Number(rp?.amount) || 0;
        const expectedPaise = Math.round(payment.amount * 100);
        if (paidPaise !== expectedPaise) {
          payment.status = 'failed';
          payment.razorpayRaw = { ...rp, mismatch: true };
          await payment.save();
          return res.json({ success: true });
        }
        payment.status = 'completed';
        payment.razorpayPaymentId = rp.id;
        payment.completedAt = new Date();
        payment.razorpayRaw = rp;
        payment.receiptNumber = payment.receiptNumber || nextReceiptNumber();
        await payment.save();
        await Organization.findByIdAndUpdate(payment.organization, { $inc: { totalReceived: payment.amount } });
      }
    }
  }

  res.json({ success: true });
});

/**
 * GET /api/payments/mine — the payer's own payment history.
 */
const getMyPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const payments = await Payment.find({ payer: req.user._id })
    .populate('organization', 'name religion type')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Math.min(50, Number(limit)));
  res.json({ success: true, payments });
});

/**
 * GET /api/payments/org — payments received by the payee's organization.
 */
const getOrgPayments = asyncHandler(async (req, res) => {
  const org = await Organization.findOne({ owner: req.user._id });
  if (!org) throw ApiError.notFound('Organization profile not found');

  const { page = 1, limit = 20, from, to, status } = req.query;
  const query = { organization: org._id };
  if (status) query.status = status;
  if (from || to) {
    query.completedAt = {};
    if (from) query.completedAt.$gte = new Date(from);
    if (to) query.completedAt.$lte = new Date(to);
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('payer', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Math.min(50, Number(limit))),
    Payment.countDocuments(query),
  ]);

  const totalAmount = (await Payment.aggregate([
    { $match: { ...query, status: 'completed' } },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]))[0]?.sum || 0;

  res.json({ success: true, payments, total, totalAmount });
});

module.exports = { createOrder, verifyPayment, webhook, getMyPayments, getOrgPayments };
