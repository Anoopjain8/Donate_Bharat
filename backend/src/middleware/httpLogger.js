const { pinoHttp } = require('pino-http');
const logger = require('../utils/logger');

/**
 * pino-http middleware: structured request/response logging keyed by the
 * request id set in `middleware/requestId.js`.
 */
const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.ip,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
  autoLogging: {
    ignore: (req) => req.url === '/health/live' || req.url === '/health/ready',
  },
});

module.exports = httpLogger;
