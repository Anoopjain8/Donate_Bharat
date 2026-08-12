const request = require('supertest');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const app = require('../src/app');
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const Category = require('../src/models/Category');
const Payment = require('../src/models/Payment');
const Bill = require('../src/models/Bill');
const RefreshToken = require('../src/models/RefreshToken');
const ReportShare = require('../src/models/ReportShare');

let server;

beforeAll(async () => {
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Category.deleteMany({}),
    Payment.deleteMany({}),
    Bill.deleteMany({}),
    RefreshToken.deleteMany({}),
    ReportShare.deleteMany({}),
  ]);
  await Category.create([
    { name: 'Religious Donation', subTypes: ['Temple Offering'] },
    { name: 'Utility Bills', subTypes: ['Electricity'] },
    { name: 'Other', subTypes: ['Custom'] },
  ]);
  server = app.listen(0);
});

afterAll(async () => {
  await server.close();
  await mongoose.disconnect();
});

const register = (over = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email: 'test@example.com', password: 'Password123', role: 'payer', ...over });

const registerPayee = (over = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({ name: 'Org Owner', email: 'org@example.com', password: 'Password123', role: 'payee', ...over });

// Email verification is enforced before a payee can create an organization.
// Simulate the "user clicked the verification link" step directly.
const markEmailVerified = (email) =>
  User.findOneAndUpdate({ email }, { isEmailVerified: true, emailVerificationToken: undefined, emailVerificationExpires: undefined });

describe('Auth', () => {
  test('registers a payer and returns tokens', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe('payer');
  });

  test('rejects duplicate email', async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
  });

  test('rejects weak password', async () => {
    const res = await register({ email: 'weak@example.com', password: 'short' });
    expect(res.status).toBe(422);
  });

  test('login works and /me returns user', async () => {
    await register();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('test@example.com');
  });

  test('rejects bad password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPass123' });
    expect(res.status).toBe(401);
  });

  test('refresh token rotates', async () => {
    const reg = await register({ email: 'rot@example.com' });
    const cookie = reg.headers['set-cookie'].find((c) => c.startsWith('refresh_token='));
    const token = cookie.split(';')[0];
    const res = await request(app).post('/api/auth/refresh').set('Cookie', token);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });
});

describe('Organizations', () => {
  test('public list only returns verified orgs', async () => {
    await Organization.create({
      owner: (await User.findOne({ email: 'test@example.com' }))._id,
      name: 'Verified Temple',
      religion: 'Hindu',
      type: 'Temple',
      verified: true,
    });
    await Organization.create({
      owner: (await User.findOne({ email: 'test@example.com' }))._id,
      name: 'Unverified Temple',
      religion: 'Hindu',
      type: 'Temple',
      verified: false,
    });
    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(200);
    const names = res.body.organizations.map((o) => o.name);
    expect(names).toContain('Verified Temple');
    expect(names).not.toContain('Unverified Temple');
  });

  test('payee can create org profile after email verification', async () => {
    const token = (await registerPayee({ email: 'payer@example.com' })).body.accessToken;
    await markEmailVerified('payer@example.com');
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'New Ashram')
      .field('religion', 'Hindu')
      .field('type', 'Temple');
    expect(res.status).toBe(201);
    expect(res.body.organization.verified).toBe(false);
  });

  test('blocks unverified payee from creating an org', async () => {
    const token = (await registerPayee({ email: 'unverified@example.com' })).body.accessToken;
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'No Email Ashram')
      .field('religion', 'Hindu')
      .field('type', 'Temple');
    expect(res.status).toBe(403);
  });

  test('rejects invalid org payload', async () => {
    const token = (await registerPayee({ email: 'payer2@example.com' })).body.accessToken;
    await markEmailVerified('payer2@example.com');
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'X');
    expect(res.status).toBe(422);
  });
});

describe('Payments', () => {
  test('payer can create an order (demo mode)', async () => {
    const token = (await register({ email: 'donor@example.com' })).body.accessToken;
    const org = await Organization.findOne({ name: 'Verified Temple' });
    const res = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org._id.toString(), amount: 250, purpose: 'Donation' });
    expect(res.status).toBe(200);
    expect(res.body.demo).toBe(true);
  });

  test('rejects unverified organization order', async () => {
    const token = (await register({ email: 'donor2@example.com' })).body.accessToken;
    const org = await Organization.findOne({ name: 'Unverified Temple' });
    const res = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org._id.toString(), amount: 250 });
    expect(res.status).toBe(404);
  });

  test('rejects invalid amount', async () => {
    const token = (await register({ email: 'donor3@example.com' })).body.accessToken;
    const org = await Organization.findOne({ name: 'Verified Temple' });
    const res = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org._id.toString(), amount: -5 });
    expect(res.status).toBe(422);
  });

  test('demo payment completes end-to-end (receipt + bill + org total)', async () => {
    const token = (await register({ email: 'donor4@example.com' })).body.accessToken;
    const org = await Organization.findOne({ name: 'Verified Temple' });
    const created = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org._id.toString(), amount: 250, purpose: 'Donation' });
    expect(created.status).toBe(200);
    expect(created.body.demo).toBe(true);
    expect(created.body.paymentId).toBeTruthy();

    const verified = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId: created.body.paymentId });
    expect(verified.status).toBe(200);
    expect(verified.body.payment.status).toBe('completed');
    expect(verified.body.billId).toBeTruthy();

    const payment = await Payment.findById(created.body.paymentId);
    expect(payment.bill).toBeTruthy();
    expect(payment.receiptPdf).toBeTruthy();

    const freshOrg = await Organization.findById(org._id);
    expect(freshOrg.totalReceived).toBeGreaterThanOrEqual(250);
  });

  test('webhook rejects a missing/invalid signature instead of erroring', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ event: 'payment.captured', payload: {} });
    expect(res.status).toBe(401);
  });
});

describe('Bills', () => {
  test('payer uploads a bill', async () => {
    const token = (await register({ email: 'biller@example.com' })).body.accessToken;
    const res = await request(app)
      .post('/api/bills')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Utility Bills')
      .field('subType', 'Electricity')
      .field('amount', '1200')
      .field('date', '2026-01-15')
      .attach('files', Buffer.from('%PDF-1.4 fake'), {
        filename: 'bill.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(201);
    expect(res.body.bill.status).toBe('pending');
    expect(res.body.bill.files.length).toBe(1);
  });

  test('rejects invalid file type', async () => {
    const token = (await register({ email: 'biller2@example.com' })).body.accessToken;
    const res = await request(app)
      .post('/api/bills')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'Utility Bills')
      .field('amount', '100')
      .attach('files', Buffer.from('malware'), {
        filename: 'evil.exe',
        contentType: 'application/x-msdownload',
      });
    expect(res.status).toBe(400);
  });

  test('payer can list and summarize their bills', async () => {
    const token = (await register({ email: 'biller3@example.com' })).body.accessToken;
    const list = await request(app).get('/api/bills/mine').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.bills)).toBe(true);

    const summary = await request(app).get('/api/bills/summary').set('Authorization', `Bearer ${token}`);
    expect(summary.status).toBe(200);
    expect(summary.body.totals).toBeDefined();
  });
});

describe('Reports', () => {
  test('exports an xlsx report', async () => {
    const token = (await register({ email: 'reporter@example.com' })).body.accessToken;
    const res = await request(app)
      .get('/api/reports/export?type=bills&format=xlsx')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  test('creates and reads a shared report link', async () => {
    const token = (await register({ email: 'sharer@example.com' })).body.accessToken;
    const shared = await request(app)
      .post('/api/reports/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bills' });
    expect(shared.status).toBe(201);
    expect(shared.body.url).toMatch(/\/shared\//);

    const tokenStr = shared.body.url.split('/').pop();
    const view = await request(app).get(`/api/reports/shared/${tokenStr}`);
    expect(view.status).toBe(200);
    expect(view.body.report.rows).toBeDefined();
  });
});

describe('Admin', () => {
  test('verifies an organization', async () => {
    const org = await Organization.create({
      owner: (await User.findOne({ email: 'test@example.com' }))._id,
      name: 'Pending Temple',
      religion: 'Hindu',
      type: 'Temple',
      verified: false,
    });
    const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'AdminPass123', role: 'admin' });
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'AdminPass123' });
    const res = await request(app)
      .patch(`/api/admin/organizations/${org._id}/verify`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ verified: true });
    expect(res.status).toBe(200);
    expect(res.body.organization.verified).toBe(true);
  });

  test('blocks non-admin from admin endpoints', async () => {
    const token = (await register({ email: 'notadmin@example.com' })).body.accessToken;
    const res = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
