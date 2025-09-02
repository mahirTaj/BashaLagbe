// utils/sendNotifications.js
const mongoose = require('mongoose');
const Notification = require('../models/notifications');
const { getIO } = require('../socket');

async function sendNotification(userId, type, title, message, url = '') {
  if (!userId) return;

  let mongoUserId = userId;

  // Only convert to ObjectId if it's not the demo user
  if (userId !== 'user_a') {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('[sendNotification] Invalid userId, skipping:', userId);
      return null;
    }
    mongoUserId = new mongoose.Types.ObjectId(userId);
  }

  const validTypes = ['message', 'listing_approval', 'rent_change', 'listing_created', 'listing_updated'];
  if (!validTypes.includes(type)) {
    console.warn(`[sendNotification] Invalid type "${type}", defaulting to "message"`);
    type = 'message';
  }

  try {
    // 1️⃣ Save notification in DB
    const notif = new Notification({
      userId: mongoUserId,
      type,
      title,
      message,
      link: url,
      isRead: false,
    });
    const saved = await notif.save();

    console.log(`[sendNotification] Notification saved for userId: ${userId}`);

    // 2️⃣ Emit via Socket.io to the user's room
    try {
      const io = getIO();
      console.log(`[sendNotification] Emitting to room user:${userId}`);
      io.to(`user:${userId}`).emit('newNotification', saved);
    } catch (err) {
      console.warn('[sendNotification] Socket emit failed:', err.message);
    }

    return saved;
  } catch (err) {
    console.error('[sendNotification] Error saving notification:', err.message);
    return null;
  }
}

module.exports = { sendNotification };
