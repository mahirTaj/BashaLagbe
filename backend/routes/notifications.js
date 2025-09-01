// backend/routes/notifications.js
const express = require('express');
const Notification = require('../models/notifications');
const verifyToken = require('../middleware/auth');
const { sendNotification } = require('../utils/sendNotifications');
const mongoose = require('mongoose');

const router = express.Router();

// ✅ Get all notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : { userId };

    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error('[GET /notifications] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ✅ Mark a notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const notifId = req.params.id;
    const userId = req.user._id;

    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: notifId, userId: new mongoose.Types.ObjectId(userId) }
      : { _id: notifId, userId };

    const notif = await Notification.findOneAndUpdate(query, { isRead: true }, { new: true });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    res.json({ success: true, notification: notif });
  } catch (err) {
    console.error('[PATCH /notifications/:id/read] Error:', err.message);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ✅ Test route to trigger a notification
router.post('/test', verifyToken, async (req, res) => {
  try {
    const { title, message, type, url } = req.body;
    const notification = await sendNotification(
      req.user._id, 
      type || 'test', 
      title || 'Test', 
      message || 'This is a test notification', 
      url || ''
    );
    res.json(notification);
  } catch (err) {
    console.error('[Test Notification] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
