const express = require('express');
const Notification = require('../models/notifications');
const verifyToken = require('../middleware/auth');


const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 });
  res.json(notifications);
});

router.patch('/:id/read', verifyToken, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
});

module.exports = router;