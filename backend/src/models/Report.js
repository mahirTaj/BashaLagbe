import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', reportSchema);