const cron = require('node-cron');
const MoveInBooking = require('../models/moveinBooking');
const MoveInSlot = require('../models/moveinSlot');
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter = null;
if (SMTP_HOST && SMTP_USER) {
  transporter = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT) || 587, secure: false, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}

async function sendReminder(to, subject, text) {
  if (transporter) {
    try { await transporter.sendMail({ from: SMTP_USER, to, subject, text }); } catch (e) { console.error('reminder send failed', e.message); }
  } else {
    console.log(`REMINDER -> ${to}: ${subject} - ${text}`);
  }
}

// Run every hour and send reminders for bookings within next 24 hours
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const slots = await MoveInSlot.find({ start: { $gte: now, $lte: next24 } });
    for (const slot of slots) {
      const bookings = await MoveInBooking.find({ slotId: slot._id, reminderSent: false });
      for (const b of bookings) {
        // In a real app tenant/landlord emails would be stored on user records
        const tenantEmail = b.tenantId + '@example.com';
        const landlordEmail = slot.landlordId + '@example.com';
        const subj = `Move-in reminder for listing ${slot.listingId}`;
        const txt = `Reminder: your move-in slot is scheduled at ${slot.start.toISOString()} - ${slot.end.toISOString()}`;
        await sendReminder(tenantEmail, subj, txt);
        await sendReminder(landlordEmail, subj, txt);
        b.reminderSent = true;
        await b.save();
      }
    }
  } catch (err) { console.error('movein reminder cron error', err.message); }
});
