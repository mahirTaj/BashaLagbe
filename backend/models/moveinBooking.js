const mongoose = require('mongoose');

const MoveInBookingSchema = new mongoose.Schema({
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'MoveInSlot', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  tenantId: { type: String, required: true },
  tenantName: { type: String },
  tenantPhone: { type: String },
  createdAt: { type: Date, default: Date.now },
  reminderSent: { type: Boolean, default: false },
});

module.exports = mongoose.model('MoveInBooking', MoveInBookingSchema);
