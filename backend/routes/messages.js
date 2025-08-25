const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const { authMiddleware } = require('../middleware/auth');

// Get messages for a listing between current user & another user
router.get('/:listingId', authMiddleware, async (req, res) => {
  try {
    const { listingId } = req.params;
    const msgs = await Message.find({
      listing: listingId,
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id }
      ]
    }).sort({ timestamp: 1 });
    res.json(msgs);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a message
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { listing, receiver, content } = req.body;
    const msg = await Message.create({
      listing,
      sender: req.user.id,
      receiver,
      content
    });
    res.json(msg);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;