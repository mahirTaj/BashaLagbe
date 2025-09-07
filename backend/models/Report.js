const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    // Reference to the reported listing (optional for user reports)
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: false,
      index: true
    },

    // Listing title (for when listingId is not available)
    listingTitle: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200
    },

    // Reference to the reported user (optional for listing reports)
    userId: {
      type: String,
      required: false,
      index: true
    },

    // User name (for when userId is not available)
    userName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100
    },

    // User who reported the listing/user
    reporterId: {
      type: String,
      required: true,
      index: true
    },

    // Report type
    reportType: {
      type: String,
      enum: ['listing', 'user'],
      required: true,
      default: 'listing'
    },

    // Report details
    reason: {
      type: String,
      enum: [
        // Listing reasons
        'misleading', 'spammy', 'offensive', 'inappropriate', 'fraudulent', 'duplicate',
        // User reasons
        'harassment', 'spam_account', 'fake_account', 'inappropriate_behavior', 'scam_attempt',
        // General
        'other'
      ],
      required: true
    },

    // Optional detailed message
    message: {
      type: String,
      trim: true,
      maxlength: 500
    },

    // Proof files (images/videos) URLs
    proofUrls: [{
      type: String,
      trim: true
    }],

    // Report status
    status: {
      type: String,
      enum: ['pending', 'under_review', 'valid', 'invalid'],
      default: 'pending'
    },

    // Admin action taken
    adminAction: {
      type: String,
      enum: ['none', 'listing_removed', 'listing_hidden', 'user_warned', 'user_banned', 'user_suspended', 'dismissed'],
      default: 'none'
    },

    // Admin notes (internal)
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    // Admin who reviewed the report
    reviewedBy: {
      type: String,
      default: null
    },

    // Review timestamp
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
ReportSchema.index({ listingId: 1, status: 1 });
ReportSchema.index({ userId: 1, status: 1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reportType: 1, status: 1 });

module.exports = mongoose.model('Report', ReportSchema);
