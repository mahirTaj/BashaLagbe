const express = require('express');
const router = express.Router();
const MoveInSlot = require('../models/moveinSlot');
const MoveInBooking = require('../models/moveinBooking');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter = null;
if (SMTP_HOST && SMTP_USER) {
  transporter = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT) || 587, secure: false, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}

async function notifyByEmail(to, subject, text) {
  if (transporter) {
    try {
      await transporter.sendMail({ from: SMTP_USER, to, subject, text });
    } catch (e) {
      console.error('sendMail failed', e && e.message ? e.message : e);
    }
  } else {
    // fallback: log notifications so they are visible during dev/testing
    console.log(`NOTIFY -> ${to}: ${subject} - ${text}`);
  }
}

// Simple auth helper (same pattern used elsewhere)
function getUserId(req) {
  // Use authenticated user only. Do NOT accept dev header/query fallbacks.
  if (req.user && (req.user.id || req.user._id)) return String(req.user.id || req.user._id);
  return '';
}

// Landlord creates slots for a listing
router.post('/slots', auth, async (req, res) => {
  try {
    const landlordId = getUserId(req);
    if (!landlordId) return res.status(401).json({ error: 'unauthorized' });
    const { listingId, start, end, capacity } = req.body;
    if (!listingId || !start || !end) return res.status(400).json({ error: 'missing fields' });
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e) || s >= e) return res.status(400).json({ error: 'invalid start/end' });
    const cap = Number(capacity) || 1;
    if (cap < 1) return res.status(400).json({ error: 'capacity must be >= 1' });

    // Prevent overlapping slots for the same listing and landlord
    const overlap = await MoveInSlot.findOne({
      listingId,
      landlordId,
      $and: [ { start: { $lt: e } }, { end: { $gt: s } } ]
    });
    if (overlap) return res.status(409).json({ error: 'overlapping slot exists' });

    const slot = new MoveInSlot({ listingId, landlordId, start: s, end: e, capacity: cap });
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
router.post('/book', auth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const tenantId = getUserId(req);
    if (!tenantId) return res.status(401).json({ error: 'unauthorized' });
  const { slotId, tenantName, tenantPhone } = req.body;
    if (!slotId) return res.status(400).json({ error: 'slotId required' });

    session.startTransaction();
    const slot = await MoveInSlot.findById(slotId).session(session);
    if (!slot) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'slot not found' });
    }
    // Prevent landlord from booking their own slot
    if (slot.landlordId === tenantId) {
      await session.abortTransaction();
      return res.status(403).json({ error: 'landlords cannot book their own slots' });
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
    // Prevent tenant from having overlapping booking (across slots)
    // Find any existing bookings for this tenant and check slot time overlap
    const tenantBookings = await MoveInBooking.find({ tenantId }).session(session);
    if (tenantBookings && tenantBookings.length) {
      // load their slots
      const slotIds = tenantBookings.map(b => b.slotId);
      const otherSlots = await MoveInSlot.find({ _id: { $in: slotIds } }).session(session);
      for (const os of otherSlots) {
        if (os && os.start < slot.end && os.end > slot.start) {
          await session.abortTransaction();
          return res.status(409).json({ error: 'you have an overlapping booking' });
        }
      }
    }
  const booking = new MoveInBooking({ slotId, listingId: slot.listingId, tenantId, tenantName, tenantPhone });
    const saved = await booking.save({ session });
    await session.commitTransaction();

    // Best-effort immediate notification to landlord and tenant (non-blocking for client)
    (async () => {
      try {
        // Try to resolve landlord and tenant emails from user records
        let landlordEmail = null;
        let tenantEmail = null;
        try {
          if (slot.landlordId) {
            if (mongoose.Types.ObjectId.isValid(slot.landlordId)) {
              const u = await User.findById(slot.landlordId);
              if (u && u.email) landlordEmail = u.email;
            } else {
              // try by email or googleId
              const u2 = await User.findOne({ $or: [{ email: slot.landlordId }, { googleId: slot.landlordId }] });
              if (u2 && u2.email) landlordEmail = u2.email;
            }
          }
        } catch (e) { /* ignore */ }

        try {
          if (tenantId) {
            if (mongoose.Types.ObjectId.isValid(tenantId)) {
              const ut = await User.findById(tenantId);
              if (ut && ut.email) tenantEmail = ut.email;
            } else {
              const ut2 = await User.findOne({ $or: [{ email: tenantId }, { googleId: tenantId }] });
              if (ut2 && ut2.email) tenantEmail = ut2.email;
            }
          }
        } catch (e) { /* ignore */ }

        // Fallback to generated example emails for dev/testing
        if (!landlordEmail) landlordEmail = (slot.landlordId || 'owner') + '@example.com';
        if (!tenantEmail) tenantEmail = (tenantId || 'tenant') + '@example.com';

        const subj = `New move-in booking for listing ${slot.listingId}`;
        const txt = `A tenant (${tenantName || tenantId}) booked a move-in slot for listing ${slot.listingId} at ${slot.start.toISOString()} - ${slot.end.toISOString()}.
Booking id: ${saved._id}`;

        // Send to landlord and tenant (best-effort)
        await Promise.all([
          notifyByEmail(landlordEmail, subj, txt),
          notifyByEmail(tenantEmail, `Booking confirmation - listing ${slot.listingId}`, `You have booked a move-in slot on ${slot.start.toISOString()} - ${slot.end.toISOString()} (booking id: ${saved._id})`)
        ]);
      } catch (e) {
        console.error('booking notify error', e && e.message ? e.message : e);
      }
    })();

    res.status(201).json(saved);
  } catch (err) {
    try { await session.abortTransaction(); } catch (e) {}
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Tenant cancels booking
router.post('/cancel', auth, async (req, res) => {
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

// Landlord: list bookings for a slot (only landlord of that slot may view)
router.get('/bookings', auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { slotId } = req.query;
    if (!slotId) return res.status(400).json({ error: 'slotId required' });
    const slot = await MoveInSlot.findById(slotId);
    if (!slot) return res.status(404).json({ error: 'slot not found' });
    if (String(slot.landlordId) !== String(userId)) return res.status(403).json({ error: 'forbidden' });

    const bookings = await MoveInBooking.find({ slotId }).lean();
    // resolve tenant contact info where possible
    const result = await Promise.all(bookings.map(async (b) => {
      let phone = null;
      try {
        if (b.tenantId && mongoose.Types.ObjectId.isValid(b.tenantId)) {
          const u = await User.findById(b.tenantId).lean();
          if (u) phone = u.contact || u.phone || null;
        } else if (b.tenantId) {
          const u2 = await User.findOne({ $or: [{ email: b.tenantId }, { googleId: b.tenantId }] }).lean();
          if (u2) phone = u2.contact || u2.phone || null;
        }
      } catch (e) { /* ignore resolution errors */ }
  // prefer explicitly stored phone on booking, fallback to resolved user phone/contact
  const phoneFinal = b.tenantPhone || phone || null;
  return { bookingId: b._id, tenantId: b.tenantId, tenantName: b.tenantName, phone: phoneFinal };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Landlord can delete a slot (and optionally cancel bookings)
router.delete('/slots/:id', auth, async (req, res) => {
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
