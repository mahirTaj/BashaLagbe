const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    images: [{ type: String }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },
    rejectReason: { type: String },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);