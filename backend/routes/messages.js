// backend/routes/messages.js
const express = require('express');
const router = express.Router();
const { getIO } = require('../socket');
const Message = require('../models/messages');
const Thread = require('../models/thread');

// 🆕 Find or create a thread
router.post('/find-or-create', async (req, res) => {
  try {
    const { listingId, landlordId, currentUserId } = req.body;

    let thread = await Thread.findOne({
      listing: listingId,
      participants: { $all: [landlordId, currentUserId] }
    });

    // Create new if none exists
    if (!thread) {
      thread = new Thread({
        listing: listingId,
        participants: [landlordId, currentUserId],
        lastMessage: '',
      });
      await thread.save();
    }

    // Notify landlord so their sidebar updates
    const io = getIO();
    io.to(`user:${landlordId}`).emit('message:notify', {
      threadId: thread._id,
      preview: 'New conversation started',
    });

    res.json(thread);
  } catch (err) {
    console.error('find-or-create error:', err.message);
    res.status(500).json({ error: 'Failed to create/find thread' });
  }
});

// 📨 Start thread with an initial message
router.post('/start', async (req, res) => {
  try {
    const { listingId, otherUserId, initialText } = req.body;
    const senderId = req.user.id || req.user._id;

    // 1️⃣ Create thread
    const thread = new Thread({
      listing: listingId,
      participants: [senderId, otherUserId],
      lastMessage: initialText,
    });
    await thread.save();

    // 2️⃣ Save first message
    const message = new Message({
      thread: thread._id,
      sender: senderId,
      text: initialText,
    });
    const savedMessage = await message.save();

    // 3️⃣ Notify the other participant
    const io = getIO();
    io.to(`user:${otherUserId}`).emit('message:notify', {
      threadId: thread._id,
      preview: initialText,
    });

    res.json({ thread, firstMessage: savedMessage });
  } catch (err) {
    console.error('start thread error:', err.message);
    res.status(500).json({ error: 'Failed to start thread' });
  }
});
