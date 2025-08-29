const Notification = require('../models/Notification');
const { io } = require('../server');

async function sendNotification(userId, type, title, message, link) {
  const notification = await Notification.create({
    userId, type, title, message, link
  });

  io.to(userId.toString()).emit('newNotification', notification);
}

module.exports = { sendNotification };