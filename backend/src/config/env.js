const dotenv = require('dotenv');
dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10) || 7,
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.AWS_BUCKET_NAME,
    endpoint: process.env.AWS_ENDPOINT || undefined,
  },
  localUploadDir: process.env.LOCAL_UPLOAD_DIR || 'uploads',
  signedUrlTtl: parseInt(process.env.SIGNED_URL_TTL, 10) || 300,
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'Donate Bharat <noreply@donatebharat.in>',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@donatebharat.in',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  },
};

const required = (name) => {
  if (!env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
};

required('mongoUri');
required('jwtSecret');
required('jwtRefreshSecret');

module.exports = env;
