const express = require('express');
const { protect } = require('../middleware/auth');
const { getFile } = require('../controllers/fileController');

const router = express.Router();

// GET /api/files/<key>?disposition=inline|attachment
router.get('/*', protect, getFile);

module.exports = router;
