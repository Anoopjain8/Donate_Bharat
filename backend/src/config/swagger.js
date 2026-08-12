const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Donate Bharat API',
      version: '2.0.0',
      description:
        'Multi-faith payment tracking platform for India. Roles: payer (track payments), ' +
        'payee (receive/manage), admin (verify orgs, manage users, audit).',
    },
    servers: [
      { url: '/', description: 'Same-origin (behind Vite/nginx proxy)' },
      { url: `http://localhost:${env.port}`, description: 'Local backend' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['payer', 'payee', 'admin'] },
            isEmailVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            lastLoginAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            religion: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            address: { type: 'object' },
            registrationNo: { type: 'string' },
            panNumber: { type: 'string' },
            website: { type: 'string' },
            verified: { type: 'boolean' },
            totalReceived: { type: 'number' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            payer: { type: 'string' },
            organization: { type: 'string' },
            amount: { type: 'number' },
            purpose: { type: 'string' },
            paymentMode: { type: 'string', enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'Cash', 'Cheque', 'Other'] },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
            receiptNumber: { type: 'string' },
            receiptPdf: { type: 'string' },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        Bill: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            payer: { type: 'string' },
            organization: { type: 'string' },
            category: { type: 'string' },
            amount: { type: 'number' },
            date: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            files: { type: 'array', items: { type: 'object' } },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  },
  apis: ['src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
