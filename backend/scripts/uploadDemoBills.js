require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');

const Bill = require('../src/models/Bill');
const env = require('../src/config/env');
const storage = require('../src/services/storage');

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function buildBillPdf(bill) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const d = (x) => (x ? new Date(x).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  doc.rect(0, 0, doc.page.width, 70).fill('#1a3a5c');
  doc
    .fill('#ffffff')
    .fontSize(20)
    .text('DONATE BHARAT', 50, 20, { align: 'center' })
    .fontSize(10)
    .text('Digital Payment & Record-Keeping Platform', { align: 'center' });

  doc.moveDown(1.5);
  doc.fill('#1a3a5c').fontSize(16).text('Payment / Bill Receipt', { align: 'center' });
  doc
    .fill('#333')
    .fontSize(9)
    .text(`Reference: ${bill.referenceNumber || '-'}    Date: ${d(bill.date)}`, { align: 'center' });

  doc.moveDown(2);
  doc.fontSize(10);
  const labelW = 140;
  const drawRow = (label, value) => {
    doc
      .font('Helvetica-Bold')
      .fill('#555')
      .text(label, 50, doc.y, { width: labelW, continued: true })
      .font('Helvetica')
      .fill('#111')
      .text(value || '-', { width: doc.page.width - 50 - labelW - 20 });
    doc.moveDown(0.6);
  };

  drawRow('Paid To:', bill.organizationName);
  drawRow('Category:', bill.category);
  drawRow('Sub Type:', bill.subType);
  drawRow('Department:', bill.department);
  drawRow('Amount:', money(bill.amount));
  drawRow('Payment Gateway:', bill.paymentGateway || 'UPI');
  drawRow('Status:', bill.status);

  doc.moveDown(2);
  doc
    .font('Helvetica-Bold')
    .fill('#1a3a5c')
    .fontSize(10)
    .text('This is a system-generated demo receipt for demonstration purposes.', { align: 'center' });

  doc.end();
  return streamToBuffer(stream);
}

async function main() {
  const conn = await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected: ${conn.connection.host}/${conn.connection.name}`);

  const bills = await Bill.find({ files: { $size: 0 } }).sort({ createdAt: 1 });
  console.log(`Found ${bills.length} bills without attached files.`);

  let updated = 0;
  let failed = 0;
  for (const bill of bills) {
    try {
      const buffer = await buildBillPdf(bill);
      const up = await storage.upload({
        buffer,
        originalName: `demo-receipt-${(bill.referenceNumber || bill._id).toString()}.pdf`,
        mime: 'application/pdf',
        folder: 'bills',
        kind: 'pdf',
      });
      bill.files = [up];
      await bill.save();
      updated += 1;
    } catch (err) {
      failed += 1;
      console.error(`  Failed ${bill._id}: ${err.message}`);
    }
  }

  console.log(`\nDone: attached demo receipt files to ${updated} bill(s)${failed ? ` (${failed} failed)` : ''}.`);
  console.log('Files are stored under the configured uploads dir (folder "bills").');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
