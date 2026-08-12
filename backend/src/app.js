const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const requestId = require('./middleware/requestId');
const httpLogger = require('./middleware/httpLogger');
const { standardLimiter } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/error');
const { liveness, readiness } = require('./controllers/healthController');
const swaggerSpec = require('./config/swagger');
const swaggerUi = require('swagger-ui-express');

const app = express();

app.set('trust proxy', 1);

app.use(requestId);
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
app.use(httpLogger);
app.use(standardLimiter);

// Health probes (no rate limit / auth by design — used by orchestrators).
app.get('/health/live', liveness);
app.get('/health/ready', readiness);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Donate Bharat API Docs' }));

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
