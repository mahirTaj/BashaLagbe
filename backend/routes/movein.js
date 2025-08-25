const express = require('express');
const router = express.Router();
const MoveInSlot = require('../models/moveinSlot');
const MoveInBooking = require('../models/moveinBooking');
const mongoose = require('mongoose');

// Simple auth helper (same pattern used elsewhere)
function getUserId(req) {
  return (req.headers['x-user-id'] || req.query.userId || '').toString();
}

// Landlord creates slots for a listing
router.post('/slots', async (req, res) => {
  try {
    const landlordId = getUserId(req);
    if (!landlordId) return res.status(401).json({ error: 'unauthorized' });
    const { listingId, start, end, capacity } = req.body;
    if (!listingId || !start || !end) return res.status(400).json({ error: 'missing fields' });
    const slot = new MoveInSlot({ listingId, landlordId, start: new Date(start), end: new Date(end), capacity: capacity || 1 });
    const saved = await slot.save();
    res.status(201).json(saved);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List slots for a listing (public)
router.get('/slots', async (req, res) => {
  try {
    const { listingId } = req.query;
    if (!listingId) return res.status(400).json({ error: 'listingId required' });
    const slots = await MoveInSlot.find({ listingId }).sort({ start: 1 });
    // also include current booked count
    const data = await Promise.all(slots.map(async (s) => {
      const count = await MoveInBooking.countDocuments({ slotId: s._id });
      return { slot: s, booked: count };
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tenant books a slot (atomic reservation preventing overbooking)
router.post('/book', async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const tenantId = getUserId(req);
    if (!tenantId) return res.status(401).json({ error: 'unauthorized' });
    const { slotId, tenantName } = req.body;
    if (!slotId) return res.status(400).json({ error: 'slotId required' });

    session.startTransaction();
    const slot = await MoveInSlot.findById(slotId).session(session);
    if (!slot) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'slot not found' });
    }
    const bookedCount = await MoveInBooking.countDocuments({ slotId }).session(session);
    if (bookedCount >= slot.capacity) {
      await session.abortTransaction();
      return res.status(409).json({ error: 'slot full' });
    }
    // Prevent same tenant booking same slot twice
    const existing = await MoveInBooking.findOne({ slotId, tenantId }).session(session);
    if (existing) {
      await session.abortTransaction();
      return res.status(409).json({ error: 'already booked' });
    }
    const booking = new MoveInBooking({ slotId, listingId: slot.listingId, tenantId, tenantName });
    const saved = await booking.save({ session });
    await session.commitTransaction();
    res.status(201).json(saved);
  } catch (err) {
    try { await session.abortTransaction(); } catch (e) {}
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Tenant cancels booking
router.post('/cancel', async (req, res) => {
  try {
    const tenantId = getUserId(req);
    if (!tenantId) return res.status(401).json({ error: 'unauthorized' });
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
    const deleted = await MoveInBooking.findOneAndDelete({ _id: bookingId, tenantId });
    if (!deleted) return res.status(404).json({ error: 'not found or not owner' });
    res.json({ message: 'cancelled' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Landlord can delete a slot (and optionally cancel bookings)
router.delete('/slots/:id', async (req, res) => {
  try {
    const landlordId = getUserId(req);
    if (!landlordId) return res.status(401).json({ error: 'unauthorized' });
    const slot = await MoveInSlot.findOneAndDelete({ _id: req.params.id, landlordId });
    if (!slot) return res.status(404).json({ error: 'not found or not owner' });
    // delete bookings for slot
    await MoveInBooking.deleteMany({ slotId: slot._id });
    res.json({ message: 'slot deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
