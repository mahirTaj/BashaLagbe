const mongoose = require('mongoose');

const MoveInSlotSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  landlordId: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  capacity: { type: Number, default: 1 }, // how many tenants can book this slot
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MoveInSlot', MoveInSlotSchema);
