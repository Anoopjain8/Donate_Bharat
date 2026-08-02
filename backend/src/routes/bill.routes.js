const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createUploader } = require('../middleware/upload');
const { createBillValidator, reviewBillValidator } = require('../utils/validators');
const {
  createBill,
  getMyBills,
  getSummary,
  getBill,
  deleteBill,
  getOrgBills,
  reviewBill,
  exportMyBillsCsv,
} = require('../controllers/billController');

const router = express.Router();
const billUploader = createUploader({ fieldName: 'files', maxFiles: 5, maxSizeMB: 10, kind: 'all' });

// Payer routes
router.post('/', protect, authorize('payer'), billUploader, createBillValidator, createBill);
router.get('/mine', protect, authorize('payer'), getMyBills);
router.get('/summary', protect, authorize('payer'), getSummary);
router.get('/export/csv', protect, authorize('payer'), exportMyBillsCsv);
router.get('/org/list', protect, authorize('payee'), getOrgBills);
router.put('/:id/review', protect, authorize('payee'), reviewBillValidator, reviewBill);
router.get('/:id', protect, getBill);
router.delete('/:id', protect, authorize('payer'), deleteBill);

module.exports = router;
