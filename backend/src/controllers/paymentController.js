const Payment = require('../models/Payment');
const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const razorpay = require('../services/razorpay');
const storage = require('../services/storage');
const { finalizePayment, nextReceiptNumber } = require('../services/payment');
const { logAudit } = require('../utils/audit');
const { sendEmail } = require('../services/email');

function safePagination(page, limit) {
  return {
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 20)),
  };
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

  // A Payment document is always created (real or demo) so the full flow —
  // order -> verify -> receipt -> bill — works end-to-end in both modes.
  const payment = await Payment.create({
    payer: req.user._id,
    organization: org._id,
    organizationName: org.name,
    amount: amountNum,
    purpose: purpose || '',
    paymentMode: paymentMode || 'UPI',
    method: 'online',
    status: 'pending',
    razorpayOrderId: order ? order.id : `order_demo_${Date.now()}`,
    metadata: { note: purpose || '' },
  });

  if (!order) {
    // Demo mode: simulated order so the flow is testable without real keys.
    return res.json({
      success: true,
      demo: true,
      paymentId: payment._id,
      order: {
        id: payment.razorpayOrderId,
        amount: Math.round(amountNum * 100),
        currency: 'INR',
        receipt: payment.receiptNumber || nextReceiptNumber(),
      },
      organization: org.toSafeJSON(),
    });
  }

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
    const receiptUrl = payment.receiptPdf ? await storage.getFileUrl(payment.receiptPdf, { download: true }) : '';
    return res.json({ success: true, message: 'Payment already verified', payment, receiptUrl, billId: payment.bill });
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
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    await payment.save();
  }

  const { payment: completed, bill, receiptUrl } = await finalizePayment({ paymentId: payment._id });

  logAudit({ actor: req.user._id, action: 'payment.verify', resource: 'Payment', resourceId: payment._id, req });

  const url = completed.receiptPdf ? await storage.getFileUrl(completed.receiptPdf, { download: true }) : receiptUrl;
  sendEmail({
    to: req.user.email,
    subject: `Receipt ${completed.receiptNumber} for your payment to ${completed.organizationName}`,
    text: `Thank you for your payment of ₹${completed.amount} to ${completed.organizationName}. Receipt: ${completed.receiptNumber}`,
    html: `<p>Thank you for your payment of <b>₹${completed.amount}</b> to <b>${completed.organizationName}</b>.</p><p>Your digital receipt is available in your dashboard.</p>`,
  }).catch(() => {});

  res.json({
    success: true,
    payment: completed.toObject(),
    receiptUrl: url,
    billId: bill ? bill._id : completed.bill,
  });
});

/**
 * POST /api/payments/webhook — Razorpay server-to-server webhook.
 * The only endpoint that marks a payment completed without user interaction.
 * Payment finalization is idempotent, so Razorpay retries are safe.
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
    const rp = body.payload?.payment?.entity;
    const orderId = rp?.order_id;
    if (orderId) {
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment && payment.status === 'pending') {
        const paidPaise = Number(rp?.amount) || 0;
        const expectedPaise = Math.round(payment.amount * 100);
        if (paidPaise !== expectedPaise) {
          payment.status = 'failed';
          payment.razorpayRaw = { ...rp, mismatch: true };
          payment.failedAt = new Date();
          await payment.save();
          return res.json({ success: true });
        }
        payment.razorpayPaymentId = rp.id;
        payment.razorpayRaw = rp;
        await payment.save();

        // Marks completed + creates receipt PDF + auto bill (idempotent).
        await finalizePayment({ paymentId: payment._id });
      }
    }
  }

  res.json({ success: true });
});

/**
 * GET /api/payments/mine — the payer's own payment history.
 */
const getMyPayments = asyncHandler(async (req, res) => {
  const { page: p, limit: l, status, from, to } = req.query;
  const { page, limit } = safePagination(p, l);
  const query = { payer: req.user._id };
  if (status) query.status = status;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('organization', 'name religion type')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  res.json({
    success: true,
    payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/payments/org — payments received by the payee's organization.
 */
const getOrgPayments = asyncHandler(async (req, res) => {
  const org = await Organization.findOne({ owner: req.user._id });
  if (!org) throw ApiError.notFound('Organization profile not found');

  const { page: p, limit: l, from, to, status } = req.query;
  const { page, limit } = safePagination(p, l);
  const query = { organization: org._id };
  if (status) query.status = status;
  if (from || to) {
    query.completedAt = {};
    if (from) query.completedAt.$gte = new Date(from);
    if (to) query.completedAt.$lte = new Date(to);
  }

  const [payments, total, totalAgg] = await Promise.all([
    Payment.find(query)
      .populate('payer', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(query),
    Payment.aggregate([
      { $match: { ...query, status: 'completed' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]),
  ]);

  const totalAmount = totalAgg[0]?.sum || 0;

  res.json({
    success: true,
    payments,
    total,
    totalAmount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

module.exports = { createOrder, verifyPayment, webhook, getMyPayments, getOrgPayments };
