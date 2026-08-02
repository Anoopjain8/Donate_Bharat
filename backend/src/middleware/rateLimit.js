const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw ApiError.badRequest('Too many attempts, try again later');
  },
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw ApiError.badRequest('Too many attempts, try again later');
  },
});

module.exports = { standardLimiter, authLimiter, strictAuthLimiter };
