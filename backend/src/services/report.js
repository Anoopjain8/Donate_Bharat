const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');
const { streamToBuffer } = require('./receiptPdf');

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const d = (x) => (x ? new Date(x).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

function csvSafe(value) {
  const str = String(value ?? '');
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
}

function buildRow(item, type) {
  if (type === 'payments') {
    return {
      'Receipt No': csvSafe(item.receiptNumber),
      Date: d(item.completedAt || item.createdAt),
      Payer: csvSafe(item.payer?.name),
      'Payer Email': csvSafe(item.payer?.email),
      Payee: csvSafe(item.organizationName),
      Purpose: csvSafe(item.purpose),
      Amount: item.amount,
      Mode: item.paymentMode,
      Status: item.status,
      'Transaction ID': csvSafe(item.razorpayPaymentId),
    };
  }
  return {
    'Bill No': csvSafe(item._id?.toString?.()),
    Date: d(item.date),
    Payer: csvSafe(item.payer?.name),
    'Payer Email': csvSafe(item.payer?.email),
    Payee: csvSafe(item.organizationName),
    Category: csvSafe(item.category),
    'Sub Type': csvSafe(item.subType),
    Reference: csvSafe(item.referenceNumber),
    Amount: item.amount,
    Status: item.status,
  };
}

/**
 * Build a formatted XLSX workbook buffer.
 * @param {Array} items  hydrated payment or bill documents
 * @param {'payments'|'bills'} type
 * @param {{title:string, from?:Date, to?:Date, generatedBy:string}} meta
 */
async function buildExcel(items, type, meta) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Donate Bharat';
  wb.created = new Date();

  const ws = wb.addWorksheet(type === 'payments' ? 'Payments' : 'Bills');
  ws.columns = Object.keys(buildRow(items[0] || {}, type)).map((key) => ({
    header: key,
    key,
    width: key === 'Payer Email' ? 28 : 20,
  }));

  ws.views = [{ state: 'frozen', ySplit: 3 }];

  const titleRow = ws.insertRow(1, [meta.title]);
  titleRow.eachCell((c) => {
    c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
  });
  ws.mergeCells(`A${1}:J${1}`);

  ws.insertRow(2, [`Period: ${d(meta.from)} - ${d(meta.to)}  |  Generated: ${new Date().toLocaleString('en-IN')}  |  By: ${meta.generatedBy || '-'}`]);

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 3) {
      row.eachCell((c) => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B5C8A' } };
      });
    }
    row.alignment = { vertical: 'middle' };
  });

  if (type === 'payments') {
    ws.addRow({ Amount: 'TOTAL' });
    const last = ws.lastRow;
    last.getCell('Amount').value = items.reduce((s, i) => s + (i.amount || 0), 0);
    last.font = { bold: true };
  }

  return wb.xlsx.writeBuffer();
}

/**
 * Build a formatted PDF report buffer.
 */
async function buildPdf(items, type, meta) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = new Readable({ read() {} });
  doc.pipe(stream);

  const header = meta.title || (type === 'payments' ? 'Payment Report' : 'Bill / Receipt Report');

  doc
    .rect(0, 0, doc.page.width, 90)
    .fill('#1a3a5c');
  doc
    .fill('#fff')
    .fontSize(20)
    .text('DONATE BHARAT', 40, 20)
    .fontSize(11)
    .text(header, 40, 48)
    .fontSize(8)
    .text(`Period: ${d(meta.from)} - ${d(meta.to)}   |   Generated: ${new Date().toLocaleString('en-IN')}`, 40, 66);

  doc.moveDown(2);

  const rowHeight = 16;
  const cols = type === 'payments'
    ? [
        { label: 'Receipt No', w: 82 },
        { label: 'Date', w: 56 },
        { label: 'Payer', w: 78 },
        { label: 'Payee', w: 78 },
        { label: 'Purpose', w: 70 },
        { label: 'Amount', w: 58 },
        { label: 'Status', w: 56 },
      ]
    : [
        { label: 'Date', w: 56 },
        { label: 'Payer', w: 76 },
        { label: 'Payee', w: 76 },
        { label: 'Category', w: 72 },
        { label: 'Reference', w: 66 },
        { label: 'Amount', w: 56 },
        { label: 'Status', w: 56 },
      ];

  const drawHeader = () => {
    doc
      .rect(40, doc.y, doc.page.width - 80, 18)
      .fill('#2b5c8a');
    let x = 40;
    cols.forEach((c) => {
      doc.fill('#fff').font('Helvetica-Bold').fontSize(7.5).text(c.label, x + 3, doc.y + 4, { width: c.w });
      x += c.w;
    });
    doc.moveDown(2.4);
  };

  drawHeader();

  doc.font('Helvetica').fontSize(7.5);
  let total = 0;
  items.forEach((item, i) => {
    if (doc.y > doc.page.height - 60) {
      doc.addPage();
      drawHeader();
    }
    if (i % 2 === 1) {
      doc.rect(40, doc.y - 8, doc.page.width - 80, rowHeight).fill('#f3f6fa');
    }
    const vals = type === 'payments'
      ? [item.receiptNumber || '-', d(item.completedAt || item.createdAt), item.payer?.name || '-', item.organizationName || '-', item.purpose || '-', money(item.amount), item.status]
      : [d(item.date), item.payer?.name || '-', item.organizationName || '-', item.category || '-', item.referenceNumber || '-', money(item.amount), item.status];
    let x = 40;
    cols.forEach((c, ci) => {
      doc.fill('#111').text(String(vals[ci] ?? '-'), x + 3, doc.y, { width: c.w });
      x += c.w;
    });
    if (type === 'payments') total += item.amount || 0;
    doc.moveDown(1.4);
  });

  if (type === 'payments' && items.length) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(9).fill('#0b7a3b').text(`TOTAL: ${money(total)}`);
  }

  if (!items.length) {
    doc.fill('#777').font('Helvetica').fontSize(10).text('No records found in the selected period.');
  }

  doc
    .moveDown(2)
    .font('Helvetica-Oblique')
    .fill('#999')
    .fontSize(8)
    .text('Digitally generated by Donate Bharat.', { align: 'center' });

  doc.end();
  return streamToBuffer(stream);
}

module.exports = { buildExcel, buildPdf, buildRow, csvSafe };
