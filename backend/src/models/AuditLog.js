const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'LISTING_APPROVED',
        'LISTING_REJECTED',
        'REPORT_RESOLVED',
        'USER_BLOCKED',
        'USER_UNBLOCKED',
        'USER_ROLE_CHANGED'
      ],
      required: true
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, required: true }, // 'Listing' | 'User' | 'Report'
    targetId: { type: String, required: true },
    meta: { type: Object }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);