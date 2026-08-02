const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    organizationName: { type: String, required: true },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least 1'],
    },
    purpose: { type: String, default: '', maxlength: 300 },
    paymentMode: {
      type: String,
      enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'Cash', 'Cheque', 'Other'],
      default: 'UPI',
    },
    method: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySignature: { type: String },
    razorpayRaw: { type: mongoose.Schema.Types.Mixed },
    receiptNumber: { type: String, unique: true, sparse: true },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    receiptPdf: { type: String, default: '' },
    completedAt: { type: Date },
    failedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ payer: 1, createdAt: -1 });
paymentSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
