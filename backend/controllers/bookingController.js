const Booking = require('../models/Booking');
const Listing = require('../models/listings');
const User = require('../models/User');
const { sendEmail } = require('../utils/mail');

// Create an available timeslot (landlord)
exports.createSlot = async (req, res) => {
  try {
    const landlordId = req.user.id;
    const { listingId, slotStart, slotEnd } = req.body;

    // Basic validation
    if (!listingId || !slotStart || !slotEnd) return res.status(400).json({ error: 'listingId, slotStart and slotEnd required' });

  const start = new Date(slotStart);
  const end = new Date(slotEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid date format' });
  if (start >= end) return res.status(400).json({ error: 'Invalid slot range' });
  const now = new Date();
  if (end <= now) return res.status(400).json({ error: 'Slot must be in the future' });

    // Ensure listing belongs to landlord
  // Validate listingId
  const mongoose = require('mongoose');
  if (!mongoose.isValidObjectId(listingId)) return res.status(400).json({ error: 'Invalid listingId' });
  const listing = await Listing.findById(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (String(listing.userId) !== String(landlordId)) return res.status(403).json({ error: 'Not authorized for this listing' });

    // Check overlap with existing available or booked slots for the same listing
    const overlapping = await Booking.findOne({
      listingId,
      $or: [
        { slotStart: { $lt: end }, slotEnd: { $gt: start } }
      ]
    });
    if (overlapping) return res.status(400).json({ error: 'Overlapping slot exists' });

    const slot = new Booking({ listingId, landlordId, slotStart: start, slotEnd: end });
    await slot.save();
    res.status(201).json(slot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// List slots for a listing (public)
exports.listSlots = async (req, res) => {
  try {
    const listingId = req.params.listingId;
    const now = new Date();
    const slots = await Booking.find({ listingId, slotEnd: { $gt: now } }).sort({ slotStart: 1 });
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Tenant books an available slot
exports.bookSlot = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const { slotId, tenantName, tenantContact } = req.body;
    if (!slotId) return res.status(400).json({ error: 'slotId required' });

    const slot = await Booking.findById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.status !== 'available') return res.status(400).json({ error: 'Slot not available' });

    // Double-check overlapping bookings for same listing and time
    const overlapping = await Booking.findOne({
      listingId: slot.listingId,
      status: 'booked',
      $or: [
        { slotStart: { $lt: slot.slotEnd }, slotEnd: { $gt: slot.slotStart } }
      ]
    });
    if (overlapping) return res.status(400).json({ error: 'Overlapping booking exists' });

  slot.tenantId = tenantId;
  if (tenantName) slot.tenantName = tenantName;
  if (tenantContact) slot.tenantContact = tenantContact;
    slot.status = 'booked';
    await slot.save();

    // Notify landlord and tenant
    const landlord = await User.findById(slot.landlordId);
    const tenant = await User.findById(tenantId);
    const listing = await Listing.findById(slot.listingId);

    const start = slot.slotStart.toISOString();
    const end = slot.slotEnd.toISOString();

    const tenantLabel = tenant?.name || slot.tenantName || slot.tenantContact || tenant?.email || 'A tenant';

    if (landlord?.email) {
      sendEmail(landlord.email, 'New booking received', `Your listing "${listing.title}" has been booked for ${start} - ${end} by ${tenantLabel}. Contact: ${slot.tenantContact || tenant?.email || ''}`)
        .catch(console.error);
    }

    // Notify tenant via email if we have one; otherwise notification is best-effort
    const tenantEmailToNotify = tenant?.email || slot.tenantContact;
    if (tenantEmailToNotify) {
      sendEmail(tenantEmailToNotify, 'Booking confirmed', `You have successfully booked move-in for "${listing.title}" at ${start} - ${end}. Landlord: ${landlord?.name || ''}`)
        .catch(console.error);
    }

    res.json(slot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Cancel a booking (tenant or landlord)
exports.cancelBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { slotId } = req.body;
    if (!slotId) return res.status(400).json({ error: 'slotId required' });

    const slot = await Booking.findById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Only tenant who booked or owning landlord can cancel
    if (String(slot.tenantId) !== String(userId) && String(slot.landlordId) !== String(userId)) {
      return res.status(403).json({ error: 'Not authorized to cancel' });
    }

    slot.status = 'cancelled';
    await slot.save();

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin/cron: send reminders for upcoming bookings within window (e.g., next 24h)
exports.sendUpcomingReminders = async (req, res) => {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24 hours

    const slots = await Booking.find({
      status: 'booked',
      slotStart: { $gt: now, $lt: windowEnd },
      reminderSent: false,
    }).populate('landlordId tenantId listingId');

    for (const s of slots) {
      const start = s.slotStart.toISOString();
      const end = s.slotEnd.toISOString();
      if (s.landlordId?.email) {
        sendEmail(s.landlordId.email, 'Upcoming booking reminder', `You have an upcoming booking for "${s.listingId.title}" at ${start} - ${end}`)
          .catch(console.error);
      }
      if (s.tenantId?.email) {
        sendEmail(s.tenantId.email, 'Upcoming booking reminder', `You have an upcoming booking for "${s.listingId.title}" at ${start} - ${end}`)
          .catch(console.error);
      }
      s.reminderSent = true;
      await s.save();
    }

    res.json({ sent: slots.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
