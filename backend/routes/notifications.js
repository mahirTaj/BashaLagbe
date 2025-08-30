const express = require('express');
const Notification = require('../models/notifications');
const verifyToken = require('../middleware/auth');
const { sendNotification } = require('../utils/sendNotifications');

const router = express.Router();

// Get all notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 });
  res.json(notifications);
});

// Mark a notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
});

// --------------------------------------------------
// TEMP: Test route to trigger a notification
// --------------------------------------------------
router.post('/test', verifyToken, async (req, res) => {
  try {
    const { title, message, type, url } = req.body;
    const notification = await sendNotification(req.user.id, type || 'test', title || 'Test', message || 'This is a test notification', url || '');
    res.json(notification);
  } catch (err) {
    console.error('[Test Notification] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
