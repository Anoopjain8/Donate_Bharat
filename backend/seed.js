require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const User = require('./src/models/User');
const Organization = require('./src/models/Organization');
const Payment = require('./src/models/Payment');
const Bill = require('./src/models/Bill');
const Category = require('./src/models/Category');
const env = require('./src/config/env');

const CATEGORY_DATA = [
  {
    name: 'Religious Donation',
    icon: '🛕',
    subTypes: ['Temple Offering', 'Church Tithe', 'Mosque Donation', 'Gurdwara Seva', 'Langar', 'Community Service'],
    departmentSuggestions: [],
  },
  {
    name: 'Municipal Corporation',
    icon: '🏢',
    subTypes: ['Property Tax', 'Water Tax', 'Sewerage Tax', 'Trade License', 'Building Permission'],
    departmentSuggestions: ['Municipal Corporation', 'Water Board', 'Revenue Department'],
  },
  {
    name: 'Vehicle',
    icon: '🚗',
    subTypes: ['Challan/Fine', 'Road Tax', 'Insurance', 'PUC', 'RC Transfer'],
    departmentSuggestions: ['RTO', 'Traffic Police', 'State Transport'],
  },
  {
    name: 'Income Tax',
    icon: '💰',
    subTypes: ['Advance Tax', 'Self-Assessment Tax', 'TDS Certificate', 'Penalty'],
    departmentSuggestions: ['Income Tax Department'],
  },
  {
    name: 'GST',
    icon: '🧾',
    subTypes: ['GST Payment', 'Return Filing', 'Registration', 'Late Fee'],
    departmentSuggestions: ['GST Department'],
  },
  {
    name: 'Utility Bills',
    icon: '⚡',
    subTypes: ['Electricity', 'Gas', 'Internet', 'Water', 'Telephone', 'Broadband'],
    departmentSuggestions: ['Electricity Board', 'Gas Agency', 'Telecom Provider'],
  },
  {
    name: 'Education',
    icon: '🎓',
    subTypes: ['School Fees', 'University Fees', 'Exam Fees', 'Donation'],
    departmentSuggestions: ['School', 'University', 'Board'],
  },
  {
    name: 'Fine/Penalty',
    icon: '🚨',
    subTypes: ['Court Fine', 'Environmental Fine', 'RTI Fee', 'Traffic Penalty'],
    departmentSuggestions: ['Court', 'Pollution Board', 'Police'],
  },
  {
    name: 'Other',
    icon: '📋',
    subTypes: ['Miscellaneous', 'Custom'],
    departmentSuggestions: [],
  },
];

const USERS = [
  ['arjun@demo.com', 'Arjun Sharma', 'payer', '9876543210'],
  ['fatima@demo.com', 'Fatima Khan', 'payer', '9876543211'],
  ['rohan@demo.com', 'Rohan Thomas', 'payer', '9876543212'],
  ['simran@demo.com', 'Simran Kaur', 'payer', '9876543213'],
  ['priya@demo.com', 'Priya Patel', 'payer', '9876543214'],
  ['amit@demo.com', 'Amit Singh', 'payer', '9876543215'],
  ['zoya@demo.com', 'Zoya Ahmed', 'payer', '9876543216'],
  ['sanjay@demo.com', 'Sanjay Jain', 'payer', '9876543217'],
];

const ORGS = [
  { name: 'Shree Siddhivinayak Temple', religion: 'Hindu', type: 'Temple', city: 'Mumbai', state: 'Maharashtra', owner: 'arjun@demo.com' },
  { name: 'Sai Baba Sansthan', religion: 'Hindu', type: 'Temple', city: 'Shirdi', state: 'Maharashtra', owner: 'fatima@demo.com' },
  { name: 'Jama Masjid Committee', religion: 'Muslim', type: 'Mosque', city: 'Delhi', state: 'Delhi', owner: 'rohan@demo.com' },
  { name: 'Sacred Heart Cathedral', religion: 'Christian', type: 'Church', city: 'New Delhi', state: 'Delhi', owner: 'simran@demo.com' },
  { name: 'Golden Temple Trust', religion: 'Sikh', type: 'Gurdwara', city: 'Amritsar', state: 'Punjab', owner: 'priya@demo.com' },
  { name: 'Mahabodhi Society', religion: 'Buddhist', type: 'Temple', city: 'Gaya', state: 'Bihar', owner: 'amit@demo.com' },
  { name: 'Shree Digambar Jain Mandir', religion: 'Jain', type: 'Temple', city: 'Delhi', state: 'Delhi', owner: 'zoya@demo.com' },
  { name: 'Kerala Charitable Trust', religion: 'Other', type: 'Charity', city: 'Kochi', state: 'Kerala', owner: 'sanjay@demo.com' },
];

function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
  if (env.nodeEnv === 'production') {
    console.error('Refusing to run seed against a production environment.');
    console.error('Set NODE_ENV=development to seed, or run with SEED_FORCE=true to override.');
    if (!process.env.SEED_FORCE) {
      process.exit(1);
    }
    console.warn('SEED_FORCE=true — proceeding to wipe the target database.');
  }

  const conn = await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected: ${conn.connection.host}/${conn.connection.name}`);

  if (!process.env.SEED_FORCE) {
    const existing = await User.estimatedDocumentCount();
    if (existing > 0) {
      console.error(`Target database "${conn.connection.name}" already has ${existing} users.`);
      console.error('Refusing to wipe non-empty database. Use SEED_FORCE=true to override.');
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  console.log('Wiping existing data...');
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Payment.deleteMany({}),
    Bill.deleteMany({}),
    Category.deleteMany({}),
  ]);

  console.log('Creating categories...');
  await Category.insertMany(CATEGORY_DATA);

  console.log('Creating users...');
  const payerUsers = [];
  for (const [email, name, role, phone] of USERS) {
    const u = await User.create({ name, email, password: 'password123', phone, role, isEmailVerified: true });
    payerUsers.push(u);
  }

  console.log('Creating organizations (verified)...');
  const orgDocs = [];
  for (const o of ORGS) {
    const owner = payerUsers.find((u) => u.email === o.owner);
    const org = await Organization.create({
      owner: owner._id,
      name: o.name,
      religion: o.religion,
      type: o.type,
      description: `${o.name} is a verified ${o.religion} organization in ${o.city}, ${o.state}.`,
      address: { street: 'MG Road', city: o.city, state: o.state, pincode: '110001' },
      verified: true,
      verifiedAt: new Date(),
    });
    orgDocs.push({ org, owner });
  }

  console.log('Creating completed donations (auto-receipts)...');
  const categories = CATEGORY_DATA.map((c) => c.name);
  const modes = ['UPI', 'Card', 'NetBanking', 'Wallet'];
  let n = 1;
  for (const { org } of orgDocs) {
    const count = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const payer = randomOf(payerUsers);
      const amount = Math.round((20 + Math.random() * 5000) * 100) / 100;
      const date = randomDate(new Date('2025-01-01'), new Date());
      const payment = await Payment.create({
        payer: payer._id,
        organization: org._id,
        organizationName: org.name,
        amount,
        purpose: randomOf(['Monthly donation', 'Festival offering', 'Charity support', 'General donation']),
        paymentMode: randomOf(modes),
        method: 'online',
        status: 'completed',
        receiptNumber: `DB-2025-${String(n).padStart(6, '0')}`,
        completedAt: date,
        razorpayPaymentId: `pay_demo_${n}`,
      });
      await Bill.create({
        payer: payer._id,
        organization: org._id,
        organizationName: org.name,
        category: 'Religious Donation',
        subType: 'General Donation',
        amount,
        date,
        referenceNumber: payment.receiptNumber,
        status: 'approved',
        autoGenerated: true,
        sourcePayment: payment._id,
      });
      n += 1;
    }
    org.totalReceived = await Payment.aggregate([
      { $match: { organization: org._id, status: 'completed' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]).then((r) => (r[0] ? r[0].sum : 0));
    await org.save();
    console.log(`  ${org.name}: ${count} payments`);
  }

  console.log('Creating uploaded bills across categories...');
  const billUsers = payerUsers.slice(0, 5);
  for (let i = 0; i < 45; i++) {
    const payer = randomOf(billUsers);
    const catName = randomOf(categories);
    const cat = CATEGORY_DATA.find((c) => c.name === catName);
    await Bill.create({
      payer: payer._id,
      organizationName: randomOf(['Maharashtra State Electricity', 'BMC', 'Income Tax Dept', 'RTO Mumbai', 'Reliance Jio']),
      category: catName,
      subType: randomOf(cat.subTypes),
      department: randomOf(cat.departmentSuggestions) || '',
      amount: Math.round((50 + Math.random() * 15000) * 100) / 100,
      date: randomDate(new Date('2025-02-01'), new Date()),
      referenceNumber: `REF${100000 + i}`,
      status: randomOf(['approved', 'pending', 'approved', 'rejected']),
      files: [],
    });
  }

  const stats = {
    users: await User.countDocuments(),
    orgs: await Organization.countDocuments(),
    payments: await Payment.countDocuments(),
    bills: await Bill.countDocuments(),
    categories: await Category.countDocuments(),
  };
  console.log('\nSeed complete:', JSON.stringify(stats, null, 2));
  console.log('\nLogin users: password = "password123" (all demo accounts)');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
