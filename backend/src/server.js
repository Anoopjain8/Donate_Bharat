const connectDB = require('./config/db');
const env = require('./config/env');
const app = require('./app');
const { bootstrapAdmin } = require('./config/bootstrap');

async function start() {
  await connectDB();
  await bootstrapAdmin();

  const server = app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      require('mongoose').disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
