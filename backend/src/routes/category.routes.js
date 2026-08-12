const express = require('express');
const { listCategories } = require('../controllers/categoryController');

/**
 * @openapi
 * tags:
 *   - name: Categories
 *     description: Bill categories for the upload form
 *
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List bill categories (public)
 *     responses:
 *       '200':
 *         description: Categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       subTypes: { type: array, items: { type: string } }
 *                       departmentSuggestions: { type: array, items: { type: string } }
 */

const router = express.Router();

router.get('/', listCategories);

module.exports = router;
