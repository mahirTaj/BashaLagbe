import mongoose from 'mongoose';

const adminActionSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actionType: { type: String, required: true }, // e.g., VERIFY_LISTING, REJECT_LISTING, RESOLVE_REPORT, BLOCK_USER
    targetType: { type: String, required: true }, // LISTING, REPORT, USER
    targetId: { type: String, required: true },
    meta: { type: Object }
  },
  { timestamps: true }
);

export const AdminAction = mongoose.model('AdminAction', adminActionSchema);