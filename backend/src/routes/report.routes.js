const express = require('express');
const { protect } = require('../middleware/auth');
const { reportQueryValidator } = require('../utils/validators');

/**
 * @openapi
 * tags:
 *   - name: Reports
 *     description: Excel/PDF/CSV export and time-limited share links
 *
 * /api/reports/export:
 *   get:
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     summary: Export the caller's payments or bills in the requested format
 *     parameters:
 *       - { name: type, in: query, schema: { type: string, enum: [payments, bills] } }
 *       - { name: format, in: query, schema: { type: string, enum: [xlsx, pdf, csv] } }
 *       - { name: from, in: query, schema: { type: string, format: date } }
 *       - { name: to, in: query, schema: { type: string, format: date } }
 *     responses:
 *       '200': { description: Binary file attachment }
 *       '422': { $ref: '#/components/schemas/Error' }
 *
 * /api/reports/share:
 *   post:
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a time-limited (7-day) public share link of a report snapshot
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [payments, bills] }
 *               from: { type: string, format: date }
 *               to: { type: string, format: date }
 *     responses:
 *       '201': { description: Share record + url }
 *
 * /api/reports/shared/{token}:
 *   get:
 *     tags: [Reports]
 *     summary: Read a shared report snapshot (public, tokenized)
 *     parameters:
 *       - { name: token, in: path, required: true, schema: { type: string } }
 *     responses:
 *       '200': { description: Report snapshot }
 *       '404': { $ref: '#/components/schemas/Error' }
 */

const {
  exportReport,
  shareReport,
  getSharedReport,
} = require('../controllers/reportController');

const router = express.Router();

router.get('/export', protect, reportQueryValidator, exportReport);
router.post('/share', protect, shareReport);
router.get('/shared/:token', getSharedReport);

module.exports = router;
