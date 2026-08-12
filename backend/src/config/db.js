const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

// Some ISP/routers fail to resolve MongoDB Atlas SRV records (querySrv ECONNREFUSED).
// Route DNS lookups through public resolvers for reliable Atlas connectivity.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });
  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  return mongoose.connection;
};

module.exports = connectDB;
