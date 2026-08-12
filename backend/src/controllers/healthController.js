const mongoose = require('mongoose');

/**
 * GET /health/live — liveness probe. Returns 200 as long as the process is up.
 */
const liveness = (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
};

/**
 * GET /health/ready — readiness probe. Verifies the process can serve traffic
 * by pinging MongoDB. Returns 503 while the DB is unreachable so orchestrators
 * (Kubernetes / Docker healthcheck) can restart or shed load.
 */
const readiness = async (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  if (!dbConnected) {
    return res.status(503).json({ status: 'unavailable', db: 'disconnected' });
  }
  try {
    await mongoose.connection.db.admin().ping();
    return res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'unavailable', db: 'unreachable' });
  }
};

module.exports = { liveness, readiness };
