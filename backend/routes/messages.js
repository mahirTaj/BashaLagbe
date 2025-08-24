const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const { authMiddleware } = require('../middleware/auth');

// Send a message
router.post('/', authMiddleware, async (req, res) => {
  const { listing, receiver, content } = req.body;
  const msg = await Message.create({ listing, sender: req.user.id, receiver, content });
  res.json(msg);
});

// Get messages for a listing between current user & landlord
router.get('/:listingId', authMiddleware, async (req, res) => {
  const msgs = await Message.find({
    listing: req.params.listingId,
    $or: [
      { sender: req.user.id },
      { receiver: req.user.id }
    ]
  }).sort({ timestamp: 1 });
  res.json(msgs);
});

module.exports = router;