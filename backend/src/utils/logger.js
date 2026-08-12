const pino = require('pino');
const env = require('../config/env');

const isDev = env.nodeEnv === 'development';
const level = env.nodeEnv === 'test' ? 'silent' : isDev ? 'debug' : 'info';

const logger = pino({
  level,
  base: { service: 'donate-bharat-api', env: env.nodeEnv },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.keySecret',
    ],
    censor: '[redacted]',
  },
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
});

module.exports = logger;
