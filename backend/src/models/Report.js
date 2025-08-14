const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    details: { type: String },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);