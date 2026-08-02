const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

const signAccessToken = (payload) =>
  jwt.sign({ ...payload, jti: crypto.randomBytes(8).toString('hex') }, env.jwtSecret, {
    expiresIn: env.accessTokenTtl,
    issuer: 'donate-bharat',
  });

const signRefreshToken = (payload) =>
  jwt.sign({ ...payload, jti: crypto.randomBytes(16).toString('hex') }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenTtlDays}d`,
    issuer: 'donate-bharat',
  });

const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret, { issuer: 'donate-bharat' });
const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret, { issuer: 'donate-bharat' });

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
