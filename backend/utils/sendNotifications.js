// utils/sendNotifications.js
const mongoose = require('mongoose');
const Notification = require('../models/notifications');
const { getIO } = require('../socket');

/**
 * Send a notification to a user.
 * Saves it in the database and emits via Socket.io to the user's room.
 * 
 * @param {string|ObjectId} userId - The user ID to notify.
 * @param {string} type - Type of notification (message, listing_approval, rent_change, listing_created, listing_updated).
 * @param {string} title - Notification title.
 * @param {string} message - Notification message.
 * @param {string} [url] - Optional URL the frontend can navigate to.
 * @returns {Promise<Object>} - The saved notification object.
 */
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

  // Ensure type is valid
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

    // ✅ Log success for demo users too
    console.log(`[sendNotification] Notification saved for userId: ${userId}`);

    // 2️⃣ Emit via Socket.io to the user's room
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('newNotification', saved); // use original ID for socket room
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
