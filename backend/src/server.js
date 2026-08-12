const connectDB = require('./config/db');
const env = require('./config/env');
const app = require('./app');
const logger = require('./utils/logger');
const { bootstrapAdmin } = require('./config/bootstrap');

let server;

async function start() {
  await connectDB();
  await bootstrapAdmin();

  server = app.listen(env.port, () => {
    logger.info(`API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal, exitCode = 0) => {
    logger.info(`${signal} received, shutting down...`);
    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    forceExit.unref();

    server.close(() => {
      require('mongoose')
        .disconnect()
        .finally(() => process.exit(exitCode));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Never let the process die silently in a bad state — log and shut down.
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    shutdown('uncaughtException', 1);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
