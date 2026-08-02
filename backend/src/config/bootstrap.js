const User = require('../models/User');
const env = require('./env');

/**
 * Creates the admin account on first boot if none exists.
 */
async function bootstrapAdmin() {
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount > 0) return;

  await User.create({
    name: 'Platform Admin',
    email: env.admin.email,
    password: env.admin.password,
    role: 'admin',
    isEmailVerified: true,
  });
  console.log(`Admin account ensured: ${env.admin.email}`);
}

module.exports = { bootstrapAdmin };
