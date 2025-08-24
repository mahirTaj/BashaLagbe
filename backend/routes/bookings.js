const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

// Landlord creates available slot
router.post('/create', auth, bookingController.createSlot);

// List slots for a listing (public)
router.get('/listing/:listingId', bookingController.listSlots);

// Tenant books a slot
router.post('/book', auth, bookingController.bookSlot);

// Cancel booking
router.post('/cancel', auth, bookingController.cancelBooking);

// Trigger reminders (protected - could be admin or cron)
router.post('/send-reminders', auth, bookingController.sendUpcomingReminders);

module.exports = router;
