const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name must be at most 120 characters'],
    },
    religion: {
      type: String,
      enum: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'],
      required: [true, 'Religion is required'],
    },
    type: {
      type: String,
      enum: ['Temple', 'Church', 'Mosque', 'Gurdwara', 'Charity', 'NGO', 'Government Department', 'Other'],
      required: [true, 'Type is required'],
    },
    description: { type: String, default: '', maxlength: 2000 },
    address: { type: addressSchema, default: () => ({}) },
    registrationNo: { type: String, default: '', trim: true },
    panNumber: { type: String, default: '', trim: true, uppercase: true },
    website: { type: String, default: '', trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    logo: { type: String, default: '' },
    verified: { type: Boolean, default: false, index: true },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalReceived: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

organizationSchema.index({ name: 'text', religion: 1, type: 1 });

organizationSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Organization', organizationSchema);
