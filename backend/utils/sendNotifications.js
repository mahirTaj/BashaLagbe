// utils/sendNotification.js
const Notification = require('../models/notifications');
const { getIO } = require('../socket');

async function sendNotification(userId, type, title, message, link) {
  const notification = await Notification.create({
    userId, type, title, message, link
  });

  const io = getIO();
  io.to(`user:${userId}`).emit('newNotification', notification);
}

module.exports = { sendNotification };
