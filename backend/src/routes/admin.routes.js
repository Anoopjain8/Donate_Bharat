const express = require('express');
const { protect, authorize } = require('../middleware/auth');
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
