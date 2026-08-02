const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { standardLimiter } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.clientOrigin.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(standardLimiter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/files', require('./routes/files.routes'));
app.use('/api/organizations', require('./routes/org.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/bills', require('./routes/bill.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
