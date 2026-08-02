const mongoose = require('mongoose');

const reportShareSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['payments', 'bills'], required: true },
    scope: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    title: { type: String, required: true },
    snapshot: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

reportShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ReportShare', reportShareSchema);
