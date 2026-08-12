const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createOrderValidator, verifyPaymentValidator } = require('../utils/validators');

/**
 * @openapi
 * tags:
 *   - name: Payments
 *     description: Razorpay orders, verification, webhooks and payment history
 *
 * /api/payments/orders:
 *   post:
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a Razorpay order for a verified organization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organizationId, amount]
 *             properties:
 *               organizationId: { type: string }
 *               amount: { type: number, minimum: 1, maximum: 1000000 }
 *               purpose: { type: string, maxLength: 300 }
 *               paymentMode: { type: string, enum: [UPI, Card, NetBanking, Wallet] }
 *     responses:
 *       '200': { description: Order created (demo:true in demo mode) }
 *       '404': { $ref: '#/components/schemas/Error' }
 *       '422': { $ref: '#/components/schemas/Error' }
 *
 * /api/payments/verify:
 *   post:
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Verify a captured payment (creates receipt + auto bill)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId]
 *             properties:
 *               paymentId: { type: string }
 *               razorpayPaymentId: { type: string }
 *               razorpaySignature: { type: string }
 *               razorpayOrderId: { type: string }
 *     responses:
 *       '200':
 *         description: Completed payment with receipt URL and bill id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment: { $ref: '#/components/schemas/Payment' }
 *                 receiptUrl: { type: string }
 *                 billId: { type: string }
 *       '400': { $ref: '#/components/schemas/Error' }
 *
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Razorpay server-to-server webhook (signature verified)
 *     responses:
 *       '200': { description: Acknowledged }
 *       '401': { $ref: '#/components/schemas/Error' }
 *
 * /api/payments/mine:
 *   get:
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     summary: The payer's own payment history
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer, maximum: 50 } }
 *       - { name: status, in: query, schema: { type: string, enum: [pending, completed, failed, refunded] } }
 *     responses:
 *       '200':
 *         description: Paginated payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments: { type: array, items: { $ref: '#/components/schemas/Payment' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *
 * /api/payments/org:
 *   get:
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Payments received by the payee's organization
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer, maximum: 50 } }
 *       - { name: status, in: query, schema: { type: string, enum: [pending, completed, failed, refunded] } }
 *       - { name: from, in: query, schema: { type: string, format: date } }
 *       - { name: to, in: query, schema: { type: string, format: date } }
 *     responses:
 *       '200':
 *         description: Paginated payments + totalAmount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments: { type: array, items: { $ref: '#/components/schemas/Payment' } }
 *                 total: { type: number }
 *                 totalAmount: { type: number }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */

const {
  createOrder,
  verifyPayment,
  webhook,
  getMyPayments,
  getOrgPayments,
} = require('../controllers/paymentController');

const router = express.Router();

// Razorpay webhook: must be mounted without auth (signature verified in-controller).
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

router.post('/orders', protect, authorize('payer'), createOrderValidator, createOrder);
router.post('/verify', protect, authorize('payer'), verifyPaymentValidator, verifyPayment);

router.get('/mine', protect, authorize('payer'), getMyPayments);
router.get('/org', protect, authorize('payee'), getOrgPayments);

module.exports = router;
