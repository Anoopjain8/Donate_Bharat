const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createUploader } = require('../middleware/upload');
const { createBillValidator, reviewBillValidator } = require('../utils/validators');

/**
 * @openapi
 * tags:
 *   - name: Bills
 *     description: Bill/receipt uploads, tracking, review and export
 *
 * /api/bills:
 *   post:
 *     tags: [Bills]
 *     security: [{ bearerAuth: [] }]
 *     summary: Upload bill files (PDF/image) with metadata (up to 5 files)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [category, amount, files]
 *             properties:
 *               category: { type: string }
 *               subType: { type: string }
 *               amount: { type: number }
 *               date: { type: string, format: date }
 *               referenceNumber: { type: string }
 *               notes: { type: string }
 *               organizationId: { type: string }
 *               files: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       '201': { description: Created bill (pending) }
 *       '422': { $ref: '#/components/schemas/Error' }
 *
 * /api/bills/mine:
 *   get:
 *     tags: [Bills]
 *     security: [{ bearerAuth: [] }]
 *     summary: The payer's bills with filters
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer, maximum: 50 } }
 *       - { name: category, in: query, schema: { type: string } }
 *       - { name: status, in: query, schema: { type: string, enum: [pending, approved, rejected] } }
 *       - { name: from, in: query, schema: { type: string, format: date } }
 *       - { name: to, in: query, schema: { type: string, format: date } }
 *       - { name: q, in: query, schema: { type: string } }
 *     responses:
 *       '200':
 *         description: Paginated bills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bills: { type: array, items: { $ref: '#/components/schemas/Bill' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *
 * /api/bills/summary:
 *   get:
 *     tags: [Bills]
 *     security: [{ bearerAuth: [] }]
 *     summary: Category/month/total breakdown for the payer
 *     responses:
 *       '200': { description: Aggregated summary }
 *
 * /api/bills/org/list:
 *   get:
 *     tags: [Bills]
 *     security: [{ bearerAuth: [] }]
 *     summary: Bills received by the payee's organization
 *     responses:
 *       '200': { description: Paginated org bills + status counts }
 *
 * /api/bills/export/csv:
 *   get:
 *     tags: [Bills]
 *     security: [{ bearerAuth: [] }]
 *     summary: Export the payer's bills as CSV
 *     responses:
 *       '200': { description: CSV attachment }
 *
 * /api/bills/{id}:
 *   get:
 *     tags: [Bills]
 *     security: [{ bearerAuth: [] }]
 *     summary: Single bill (owner, admin or related org)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       '200': { description: Bill with file URLs, $ref: '#/components/schemas/Bill' }
 *       '403': { $ref: '#/components/schemas/Error' }
 *       '404': { $ref: '#/components/schemas/Error' }
 *   delete:
 *     tags: [Bills]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete the payer's own bill
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       '200': { description: Bill deleted }
 *       '404': { $ref: '#/components/schemas/Error' }
 *
 * /api/bills/{id}/review:
 *   put:
 *     tags: [Bills]
 *     security: [{ bearerAuth: [] }]
 *     summary: Approve/reject a bill (payee org)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *               reviewNote: { type: string, maxLength: 1000 }
 *     responses:
 *       '200': { description: Updated bill }
 *       '403': { $ref: '#/components/schemas/Error' }
 */

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
