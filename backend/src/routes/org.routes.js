const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createUploader } = require('../middleware/upload');
const { createOrgValidator, updateOrgValidator, listQueryValidator } = require('../utils/validators');

/**
 * @openapi
 * tags:
 *   - name: Organizations
 *     description: Public browse + payee-owned organization profiles
 *
 * /api/organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: Browse verified organizations (public)
 *     parameters:
 *       - { name: religion, in: query, schema: { type: string } }
 *       - { name: type, in: query, schema: { type: string } }
 *       - { name: search, in: query, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer, minimum: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, maximum: 50 } }
 *     responses:
 *       '200':
 *         description: Paginated verified organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizations: { type: array, items: { $ref: '#/components/schemas/Organization' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *   post:
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create an organization profile (payee, email must be verified)
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, religion, type]
 *             properties:
 *               name: { type: string }
 *               religion: { type: string }
 *               type: { type: string }
 *               description: { type: string }
 *               registrationNo: { type: string }
 *               panNumber: { type: string }
 *               logo: { type: string, format: binary }
 *     responses:
 *       '201': { description: Created organization (pending verification) }
 *       '403': { $ref: '#/components/schemas/Error' }
 *
 * /api/organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Organization detail (public, unless unverified & owned)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       '200': { description: Organization, $ref: '#/components/schemas/Organization' }
 *       '404': { $ref: '#/components/schemas/Error' }
 *
 * /api/organizations/mine:
 *   get:
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *     summary: Current payee's own organization profile
 *     responses:
 *       '200': { description: Organization, $ref: '#/components/schemas/Organization' }
 *       '404': { $ref: '#/components/schemas/Error' }
 *   put:
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update the current payee's organization profile
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               religion: { type: string }
 *               type: { type: string }
 *               description: { type: string }
 *               logo: { type: string, format: binary }
 *     responses:
 *       '200': { description: Updated organization }
 *       '404': { $ref: '#/components/schemas/Error' }
 */

const {
  listOrganizations,
  getOrganization,
  getMyOrganization,
  createOrganization,
  updateMyOrganization,
} = require('../controllers/orgController');

const router = express.Router();
const logoUploader = createUploader({ fieldName: 'logo', maxFiles: 1, maxSizeMB: 2, kind: 'images' });

router.get('/', listQueryValidator, listOrganizations);
router.get('/mine', protect, authorize('payee'), getMyOrganization);
router.get('/:id', getOrganization);

router.post('/', protect, authorize('payee'), logoUploader, createOrgValidator, createOrganization);
router.put('/mine', protect, authorize('payee'), logoUploader, updateOrgValidator, updateMyOrganization);

module.exports = router;
