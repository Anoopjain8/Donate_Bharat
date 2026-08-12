const express = require('express');
const { protect } = require('../middleware/auth');
const { getFile } = require('../controllers/fileController');

/**
 * @openapi
 * tags:
 *   - name: Files
 *     description: Authorized file proxy for stored bills/receipts
 *
 * /api/files/{key}:
 *   get:
 *     tags: [Files]
 *     security: [{ bearerAuth: [] }]
 *     summary: Stream a stored file (bill/receipt/org logo) to the browser
 *     parameters:
 *       - { name: key, in: path, required: true, schema: { type: string } }
 *       - { name: disposition, in: query, schema: { type: string, enum: [inline, attachment] } }
 *     responses:
 *       '200': { description: File stream }
 *       '403': { $ref: '#/components/schemas/Error' }
 *       '404': { description: File not found }
 */

const router = express.Router();

// GET /api/files/<key>?disposition=inline|attachment
router.get('/*', protect, getFile);

module.exports = router;
