const { body, query } = require('express-validator');
const { validate } = require('../middleware/validate');

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const ORG_TYPES = ['Temple', 'Church', 'Mosque', 'Gurdwara', 'Charity', 'NGO', 'Government Department', 'Other'];
const CATEGORIES = ['Religious Donation', 'Municipal Corporation', 'Vehicle', 'Income Tax', 'GST', 'Utility Bills', 'Education', 'Fine/Penalty', 'Other'];

const registerValidator = validate([
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('phone').optional({ values: 'falsy' }).matches(/^[0-9+\-\s]{8,15}$/).withMessage('Invalid phone'),
  body('role').optional().isIn(['payer', 'payee']).withMessage('Role must be payer or payee'),
]);

const loginValidator = validate([
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
]);

const changePasswordValidator = validate([
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Must contain a letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
]);

const forgotPasswordValidator = validate([
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
]);

const resetPasswordValidator = validate([
  body('token').notEmpty().withMessage('Token required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Must contain a letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
]);

const createOrgValidator = validate([
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters'),
  body('religion').isIn(RELIGIONS).withMessage('Invalid religion'),
  body('type').isIn(ORG_TYPES).withMessage('Invalid organization type'),
  body('registrationNo').optional({ values: 'falsy' }).isLength({ max: 50 }).withMessage('Registration number too long'),
  body('panNumber').optional({ values: 'falsy' }).matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/).withMessage('Invalid PAN format'),
  body('website').optional({ values: 'falsy' }).isURL({ require_protocol: false }).withMessage('Invalid website'),
  body('description').optional({ values: 'falsy' }).isLength({ max: 2000 }),
]);

const updateOrgValidator = validate([
  body('name').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters'),
  body('religion').optional().isIn(RELIGIONS).withMessage('Invalid religion'),
  body('type').optional().isIn(ORG_TYPES).withMessage('Invalid organization type'),
  body('panNumber').optional({ values: 'falsy' }).matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/).withMessage('Invalid PAN format'),
]);

const createOrderValidator = validate([
  body('organizationId').isMongoId().withMessage('Invalid organization id'),
  body('amount').isFloat({ min: 1, max: 1000000 }).withMessage('Amount must be between 1 and 1,000,000'),
  body('purpose').optional().isLength({ max: 300 }),
  body('paymentMode').optional().isIn(['UPI', 'Card', 'NetBanking', 'Wallet']).withMessage('Invalid payment mode'),
]);

const verifyPaymentValidator = validate([
  body('paymentId').isMongoId().withMessage('Invalid payment id'),
  body('razorpayPaymentId').optional(),
  body('razorpaySignature').optional(),
  body('razorpayOrderId').optional(),
]);

const createBillValidator = validate([
  body('category').isIn(CATEGORIES).withMessage('Invalid category'),
  body('subType').optional({ values: 'falsy' }).isLength({ max: 80 }),
  body('department').optional({ values: 'falsy' }).isLength({ max: 80 }),
  body('religion').optional({ values: 'falsy' }).isIn(['', ...RELIGIONS]).withMessage('Invalid religion'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a valid number >= 0'),
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
  body('referenceNumber').optional({ values: 'falsy' }).isLength({ max: 60 }),
  body('notes').optional({ values: 'falsy' }).isLength({ max: 1000 }),
  body('organizationId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid organization id'),
]);

const reviewBillValidator = validate([
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reviewNote').optional({ values: 'falsy' }).isLength({ max: 1000 }),
]);

const verifyOrgValidator = validate([
  body('verified').isBoolean().withMessage('verified must be a boolean'),
]);

const toggleUserValidator = validate([
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
]);

const createCategoryValidator = validate([
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Category name required'),
  body('subTypes').optional().isArray().withMessage('subTypes must be an array'),
  body('departmentSuggestions').optional().isArray().withMessage('departmentSuggestions must be an array'),
]);

const listQueryValidator = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit'),
]);

const reportQueryValidator = validate([
  query('type').optional().isIn(['payments', 'bills']).withMessage('Invalid report type'),
  query('format').optional().isIn(['xlsx', 'pdf', 'csv']).withMessage('Invalid format'),
  query('from').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid from date'),
  query('to').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid to date'),
]);

module.exports = {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  createOrgValidator,
  updateOrgValidator,
  createOrderValidator,
  verifyPaymentValidator,
  createBillValidator,
  reviewBillValidator,
  verifyOrgValidator,
  toggleUserValidator,
  createCategoryValidator,
  listQueryValidator,
  reportQueryValidator,
};
