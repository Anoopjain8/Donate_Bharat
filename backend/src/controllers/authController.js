const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/token');
const { sendEmail, isConfigured: smtpConfigured } = require('../services/email');
const { logAudit } = require('../utils/audit');
const logger = require('../utils/logger');
const env = require('../config/env');

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.nodeEnv === 'production',
  path: '/',
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...COOKIE_OPTS,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, COOKIE_OPTS);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(user, res, req) {
  const payload = { sub: user._id.toString(), role: user.role };
  const accessToken = signAccessToken(payload);

  const family = crypto.randomBytes(16).toString('hex');
  const refreshToken = signRefreshToken({ sub: user._id.toString(), fam: family });
  const tokenHash = hashToken(refreshToken);

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    family,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
    userAgent: req.get('user-agent') || '',
    ip: req.ip || '',
  });

  setRefreshCookie(res, refreshToken);
  return { accessToken, user: user.toSafeJSON() };
}

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    name,
    email,
    password,
    phone: phone || undefined,
    role: role === 'payee' ? 'payee' : 'payer',
    emailVerificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const { accessToken, user: safeUser } = await issueTokens(user, res, req);
  logAudit({ actor: user._id, action: 'auth.register', resource: 'User', resourceId: user._id, req });

  // Best-effort verification email; never blocks registration.
  const verifyLink = `${env.clientOrigin[0]}/verify-email?token=${verificationToken}`;
  sendEmail({
    to: user.email,
    subject: 'Verify your Donate Bharat email',
    text: `Welcome ${user.name}! Verify your email to unlock organization features: ${verifyLink} (valid 24 hours).`,
    html: `<p>Hi ${user.name},</p><p>Verify your email address:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>Link expires in 24 hours.</p>`,
  }).catch(() => {});
  if (!smtpConfigured() && env.nodeEnv !== 'production') {
    logger.info({ to: user.email, verifyLink }, 'SMTP not configured — dev verification link');
  }

  res.status(201).json({ success: true, accessToken, user: safeUser });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    // Audit failed attempts for account-takeover / brute-force monitoring.
    logAudit({ actor: user?._id, action: 'auth.login.failed', resource: 'User', resourceId: user?._id, req, meta: { email } });
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('Your account has been disabled');

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, user: safeUser } = await issueTokens(user, res, req);
  logAudit({ actor: user._id, action: 'auth.login', resource: 'User', resourceId: user._id, req });

  res.json({ success: true, accessToken, user: safeUser });
});

/**
 * POST /api/auth/refresh — rotates the refresh token (family-based).
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token');

  const tokenHash = hashToken(token);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored || stored.revokedAt) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }
  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token expired');
  }

  const user = await User.findById(stored.user);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account inactive');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  if (decoded.sub !== user._id.toString() || decoded.fam !== stored.family) {
    throw ApiError.unauthorized('Refresh token mismatch');
  }

  // Rotate: revoke this token and emit a new one in the same family.
  stored.revokedAt = new Date();
  await stored.save();

  const newToken = signRefreshToken({ sub: user._id.toString(), fam: stored.family });
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(newToken),
    family: stored.family,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
    userAgent: req.get('user-agent') || '',
    ip: req.ip || '',
  });
  setRefreshCookie(res, newToken);

  res.json({
    success: true,
    accessToken: signAccessToken({ sub: user._id.toString(), role: user.role }),
    user: user.toSafeJSON(),
  });
});

/**
 * POST /api/auth/logout — revokes the current refresh token.
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(token) },
      { $set: { revokedAt: new Date() } }
    );
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});

/**
 * PUT /api/auth/password — authenticated password change.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must differ from current password');
  }
  user.password = newPassword;
  await user.save();

  // Revoke all other refresh tokens for this user.
  await RefreshToken.updateMany(
    { user: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  logAudit({ actor: user._id, action: 'auth.password.change', resource: 'User', resourceId: user._id, req });
  res.json({ success: true, message: 'Password updated. Please sign in again.' });
});

/**
 * POST /api/auth/forgot-password — sends a reset token by email.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    // Always return success to avoid account enumeration.
    return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const link = `${env.clientOrigin[0]}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your Donate Bharat password',
    text: `Reset your password using this link (valid 30 minutes): ${link}`,
    html: `<p>Hi ${user.name},</p><p>Click to reset your password:</p><p><a href="${link}">${link}</a></p>`,
  });

  res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
});

/**
 * POST /api/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) throw ApiError.badRequest('Reset token is invalid or has expired');

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  logAudit({ actor: user._id, action: 'auth.password.reset', resource: 'User', resourceId: user._id, req });
  res.json({ success: true, message: 'Password reset successfully. Please sign in.' });
});

/**
 * POST /api/auth/verify-email — confirms the email address from a token link.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: new Date() },
  });
  if (!user) throw ApiError.badRequest('Verification link is invalid or has expired');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  logAudit({ actor: user._id, action: 'auth.email.verify', resource: 'User', resourceId: user._id, req });
  res.json({ success: true, message: 'Email verified successfully. You can now create an organization.' });
});

/**
 * POST /api/auth/resend-verification — resend the verification email.
 */
const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.isEmailVerified) {
    return res.json({ success: true, message: 'Your email is already verified.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  req.user.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  req.user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await req.user.save();

  const verifyLink = `${env.clientOrigin[0]}/verify-email?token=${token}`;
  sendEmail({
    to: req.user.email,
    subject: 'Verify your Donate Bharat email',
    text: `Verify your email address: ${verifyLink} (valid 24 hours).`,
    html: `<p>Verify your email address:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>Link expires in 24 hours.</p>`,
  }).catch(() => {});
  if (!smtpConfigured() && env.nodeEnv !== 'production') {
    logger.info({ to: req.user.email, verifyLink }, 'SMTP not configured — dev verification link');
  }

  res.json({ success: true, message: 'Verification email sent.' });
});

module.exports = {
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
};
