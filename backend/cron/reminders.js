const cron = require('node-cron');
const Booking = require('../models/Booking');
const Listing = require('../models/listings');
const User = require('../models/User');
const { sendEmail } = require('../utils/mail');

// Run every hour to send reminders for bookings within next 24 hours
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const slots = await Booking.find({
      status: 'booked',
      slotStart: { $gt: now, $lt: windowEnd },
      reminderSent: false,
    }).populate('landlordId tenantId listingId');

    for (const s of slots) {
      const start = s.slotStart.toISOString();
      const end = s.slotEnd.toISOString();
      if (s.landlordId?.email) {
        await sendEmail(s.landlordId.email, 'Upcoming booking reminder', `You have an upcoming booking for "${s.listingId.title}" at ${start} - ${end}`);
      }
      if (s.tenantId?.email) {
        await sendEmail(s.tenantId.email, 'Upcoming booking reminder', `You have an upcoming booking for "${s.listingId.title}" at ${start} - ${end}`);
      }
      s.reminderSent = true;
      await s.save();
    }
  } catch (err) {
    console.error('Reminder cron error', err);
  }
});
