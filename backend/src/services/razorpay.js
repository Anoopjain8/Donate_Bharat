const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');

const isConfigured = () =>
  env.razorpay.keyId &&
  env.razorpay.keySecret &&
  env.razorpay.keyId !== 'rzp_test_placeholder' &&
  env.razorpay.keySecret !== 'placeholder';

let client = null;
function getClient() {
  if (!isConfigured()) return null;
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return client;
}

/**
 * Create a Razorpay order for an amount in INR.
 * Returns the order object (or null in demo mode).
 */
async function createOrder({ amount, receipt, notes }) {
  const rzp = getClient();
  if (!rzp) return null;
  const order = await rzp.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
    notes: notes || {},
  });
  return order;
}

/**
 * Verify the payment signature returned by the Razorpay checkout.
 * Standard HMAC-SHA256 verification using order_id + payment_id.
 */
function verifySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Verify a Razorpay webhook signature from the raw request body.
 * @param {Buffer|string} body raw request body
 */
function verifyWebhook(body, signature) {
  if (!env.razorpay.webhookSecret || !signature) return false;
  const raw = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(raw)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function fetchPayment(paymentId) {
  const rzp = getClient();
  if (!rzp) return null;
  return rzp.payments.fetch(paymentId);
}

async function capturePayment(paymentId, amountInPaise) {
  const rzp = getClient();
  if (!rzp) return null;
  return rzp.payments.capture(paymentId, amountInPaise, { currency: 'INR' });
}

module.exports = {
  isConfigured,
  getClient,
  createOrder,
  verifySignature,
  verifyWebhook,
  fetchPayment,
  capturePayment,
};
