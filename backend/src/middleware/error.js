const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error instanceof mongoose.Error.ValidationError) {
      const details = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      error = new ApiError(422, 'Validation failed', details);
    } else if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      error = new ApiError(409, `${field} already exists`);
    } else if (error.name === 'CastError') {
      error = ApiError.badRequest(`Invalid ${error.path}`);
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Invalid or expired token');
    } else {
      error = new ApiError(
        500,
        env.nodeEnv === 'production' ? 'Internal server error' : error.message,
        env.nodeEnv === 'production' ? undefined : error.stack
      );
    }
  }

  if (error.statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(error.statusCode === 500 && env.nodeEnv !== 'production'
      ? { stack: error.stack }
      : {}),
  });
};

module.exports = { notFoundHandler, errorHandler };
