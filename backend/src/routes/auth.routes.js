const express = require('express');
const { protect } = require('../middleware/auth');
const { authLimiter, strictAuthLimiter } = require('../middleware/rateLimit');

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Registration, login, session, password and email verification
 *
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new payer/payee account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 80 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               phone: { type: string }
 *               role: { type: string, enum: [payer, payee] }
 *     responses:
 *       '201': { description: Account created with access token }
 *       '409': { $ref: '#/components/schemas/Error' }
 *       '422': { $ref: '#/components/schemas/Error' }
 *
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email + password (sets refresh cookie)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       '200': { description: Access token + user }
 *       '401': { $ref: '#/components/schemas/Error' }
 *
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh token from the httpOnly cookie
 *     responses:
 *       '200': { description: New access token + rotated refresh cookie }
 *       '401': { $ref: '#/components/schemas/Error' }
 *
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke the current refresh token and clear the cookie
 *     responses:
 *       '200': { description: Logged out }
 *
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Current user profile
 *     responses:
 *       '200': { description: User, $ref: '#/components/schemas/User' }
 *       '401': { $ref: '#/components/schemas/Error' }
 *
 * /api/auth/password:
 *   put:
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Change password (revokes all refresh tokens)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       '200': { description: Password updated }
 *       '401': { $ref: '#/components/schemas/Error' }
 *
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send a password reset link by email
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       '200': { description: Always 200 to avoid account enumeration }
 *
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password using a reset token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       '200': { description: Password reset }
 *       '400': { $ref: '#/components/schemas/Error' }
 *
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify an email address from the emailed token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       '200': { description: Email verified }
 *       '400': { $ref: '#/components/schemas/Error' }
 *
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Resend the email verification link
 *     responses:
 *       '200': { description: Verification email sent }
 *       '401': { $ref: '#/components/schemas/Error' }
 */
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
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
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, register);
router.post('/login', strictAuthLimiter, loginValidator, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidator, resetPassword);
router.post('/verify-email', authLimiter, verifyEmailValidator, verifyEmail);

router.get('/me', protect, getMe);
router.put('/password', protect, changePasswordValidator, changePassword);
router.post('/resend-verification', protect, resendVerification);

module.exports = router;
