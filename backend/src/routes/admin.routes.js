const express = require('express');
const { protect, authorize } = require('../middleware/auth');

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Admin-only platform management (all endpoints require the admin role)
 *
 * /api/admin/overview:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Platform KPIs (users, orgs, payments, revenue)
 *     responses:
 *       '200': { description: Overview metrics }
 *       '403': { $ref: '#/components/schemas/Error' }
 *
 * /api/admin/organizations:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List organizations, filtered by verification status
 *     parameters:
 *       - { name: status, in: query, schema: { type: string, enum: [all, pending, verified] } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer, maximum: 50 } }
 *       - { name: q, in: query, schema: { type: string } }
 *     responses:
 *       '200': { description: Paginated organizations }
 *
 * /api/admin/organizations/{id}/verify:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Verify or unverify an organization (and its owner's payee role)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verified]
 *             properties:
 *               verified: { type: boolean }
 *     responses:
 *       '200': { description: Updated organization }
 *       '404': { $ref: '#/components/schemas/Error' }
 *
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List users, filtered by role/search
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer, maximum: 50 } }
 *       - { name: role, in: query, schema: { type: string, enum: [payer, payee, admin] } }
 *       - { name: q, in: query, schema: { type: string } }
 *     responses:
 *       '200': { description: Paginated users }
 *
 * /api/admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Activate/deactivate a user (admin accounts cannot be disabled)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       '200': { description: Updated user }
 *       '400': { $ref: '#/components/schemas/Error' }
 *
 * /api/admin/categories:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List all categories
 *     responses:
 *       '200': { description: Categories }
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a category
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               subTypes: { type: array, items: { type: string } }
 *               departmentSuggestions: { type: array, items: { type: string } }
 *     responses:
 *       '201': { description: Created category }
 *
 * /api/admin/categories/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a category
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       '200': { description: Updated category }
 *
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Full audit log with actor info
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer, maximum: 100 } }
 *     responses:
 *       '200': { description: Paginated audit logs }
 */

const {
  verifyOrgValidator,
  toggleUserValidator,
  createCategoryValidator,
} = require('../utils/validators');
const {
  getOverview,
  listOrganizations,
  verifyOrganization,
  listUsers,
  toggleUserStatus,
  getCategories,
  createCategory,
  updateCategory,
  getAuditLogs,
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/overview', getOverview);
router.get('/organizations', listOrganizations);
router.patch('/organizations/:id/verify', verifyOrgValidator, verifyOrganization);
router.get('/users', listUsers);
router.patch('/users/:id/status', toggleUserValidator, toggleUserStatus);
router.get('/categories', getCategories);
router.post('/categories', createCategoryValidator, createCategory);
router.patch('/categories/:id', createCategoryValidator, updateCategory);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
