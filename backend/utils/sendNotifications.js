// utils/sendNotifications.js
const Notification = require('../models/notifications');
const { getIO } = require('../socket');

/**
 * Send a notification to a user.
 * Saves it in the database and emits via Socket.io to the user's room.
 * 
 * @param {string} userId - The user ID to notify.
 * @param {string} type - Type of notification (e.g., listing_approval, listing_update).
 * @param {string} title - Notification title.
 * @param {string} message - Notification message.
 * @param {string} [url] - Optional URL the frontend can navigate to.
 * @returns {Promise<Object>} - The saved notification object.
 */
async function sendNotification(userId, type, title, message, url = '') {
  if (!userId) return;

  try {
    // 1️⃣ Save notification in the database
    const notif = new Notification({
      userId,
      type,
      title,
      message,
      url,
      isRead: false,
    });
    const saved = await notif.save();

    // 2️⃣ Emit via Socket.io to the user's room
    try {
      const io = getIO();
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
