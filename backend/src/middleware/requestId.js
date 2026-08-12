const crypto = require('crypto');

/**
 * Assigns a request id to every request (reusing an inbound X-Request-Id when
 * present, so a load balancer / API gateway can correlate traces) and echoes
 * it back on the response. Exposed as `req.id` for logging.
 */
module.exports = function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
