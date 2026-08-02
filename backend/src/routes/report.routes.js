const express = require('express');
const { protect } = require('../middleware/auth');
const { reportQueryValidator } = require('../utils/validators');
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
