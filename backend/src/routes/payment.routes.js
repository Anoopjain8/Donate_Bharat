const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createOrderValidator, verifyPaymentValidator } = require('../utils/validators');
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
