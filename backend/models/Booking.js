const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenantName: { type: String },
  tenantContact: { type: String },
  slotStart: { type: Date, required: true },
  slotEnd: { type: Date, required: true },
  status: { type: String, enum: ['available','booked','cancelled'], default: 'available' },
  createdAt: { type: Date, default: Date.now },
  reminderSent: { type: Boolean, default: false }
});

BookingSchema.index({ listingId: 1, slotStart: 1, slotEnd: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
