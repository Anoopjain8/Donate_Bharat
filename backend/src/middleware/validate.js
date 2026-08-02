const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs express-validator chain and throws a 422 with field details.
 */
const validate = (chain) => [
  ...chain,
  (req, _res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    next(ApiError.unprocessable('Validation failed', details));
  },
];

module.exports = { validate };
