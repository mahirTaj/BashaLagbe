// backend/routes/messages.js
const express = require('express');
const router = express.Router();
const { getIO } = require('../socket');
const { Message, MessageThread } = require('../models/messages');

// Helper: normalize any ObjectId/string → string
const asString = (v) => (v ? String(v) : null);

// 🆕 Find or create a thread
router.post('/find-or-create', async (req, res) => {
  try {
    const { listingId, landlordId, currentUserId } = req.body;

    const landlord = asString(landlordId);
    const currentUser = asString(currentUserId);

    let thread = await MessageThread.findOne({
      listing: listingId,
      participants: { $all: [landlord, currentUser] },
    });

    if (!thread) {
      thread = new MessageThread({
        listing: listingId,
        participants: [landlord, currentUser],
        lastMessage: '',
      });
      await thread.save();
    }

    // Notify landlord so their sidebar updates
    const io = getIO();
    io.to(`user:${landlord}`).emit('message:notify', {
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
    const senderId = asString(req.user?.id || req.user?._id);
    const otherUser = asString(otherUserId);

    const thread = new MessageThread({
      listing: listingId,
      participants: [senderId, otherUser],
      lastMessage: initialText,
    });
    await thread.save();

    const message = new Message({
      thread: thread._id,
      sender: senderId,
      text: initialText,
    });
    const savedMessage = await message.save();

    const io = getIO();

    // 📌 notify sidebar preview
    io.to(`user:${otherUser}`).emit('message:notify', {
      threadId: thread._id,
      preview: initialText,
    });

    // 📌 deliver actual new message in the thread
    io.to(`thread:${thread._id}`).emit('message:new', {
      threadId: thread._id,
      message: savedMessage,
    });

    res.json({ thread, firstMessage: savedMessage });
  } catch (err) {
    console.error('start thread error:', err.message);
    res.status(500).json({ error: 'Failed to start thread' });
  }
});

// ✉️ Send a new message
router.post('/:id/send', async (req, res) => {
  try {
    const threadId = req.params.id;
    const { text } = req.body;
    const senderId = asString(req.user?.id || req.user?._id);

    const thread = await MessageThread.findById(threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const message = new Message({
      thread: threadId,
      sender: senderId,
      text,
    });
    const savedMessage = await message.save();

    // Update thread preview
    thread.lastMessage = text;
    thread.updatedAt = new Date();
    await thread.save();

    const io = getIO();

    // 📌 notify other participants’ sidebars
    thread.participants
      .filter((p) => asString(p) !== senderId)
      .forEach((userId) => {
        io.to(`user:${userId}`).emit('message:notify', {
          threadId,
          preview: text,
        });
      });

    // 📌 deliver to everyone in the thread room (active chat boxes)
    io.to(`thread:${threadId}`).emit('message:new', {
      threadId,
      message: savedMessage,
    });

    res.json(savedMessage);
  } catch (err) {
    console.error('send message error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
