const express = require('express');
const { protect } = require('../middleware/auth');
const { authLimiter, strictAuthLimiter } = require('../middleware/rateLimit');
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../utils/validators');
const {
  register,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, register);
router.post('/login', strictAuthLimiter, loginValidator, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidator, resetPassword);

router.get('/me', protect, getMe);
router.put('/password', protect, changePasswordValidator, changePassword);

module.exports = router;
