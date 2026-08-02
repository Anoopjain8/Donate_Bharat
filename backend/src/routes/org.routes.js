const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createUploader } = require('../middleware/upload');
const { createOrgValidator, updateOrgValidator, listQueryValidator } = require('../utils/validators');
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
