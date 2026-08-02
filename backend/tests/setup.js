const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_that_is_long_enough_1234567890';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_0987654321';
process.env.STORAGE_DRIVER = 'local';
process.env.LOCAL_UPLOAD_DIR = 'test-uploads';
process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
process.env.RAZORPAY_KEY_SECRET = 'placeholder';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

// Point tests at a dedicated test database on the same cluster.
if (!process.env.MONGODB_URI) {
  const base = require('dotenv').config().parsed?.MONGODB_URI;
  if (base) {
    process.env.MONGODB_URI = base
      .replace(/\/[^/?]+(\?)/, '/donate_bharat_test$1')
      .replace(/\/[^/?]+$/, '/donate_bharat_test');
  } else {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/donate_bharat_test';
  }
}
