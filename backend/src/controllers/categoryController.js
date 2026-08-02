const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/categories — public list of active payment categories.
 */
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ createdAt: 1 });
  res.json({ success: true, categories });
});

module.exports = { listCategories };
