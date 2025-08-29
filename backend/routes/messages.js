const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');// ✅ matches new export
const { Message, MessageThread } = require('../models/messages');

// ✅ NEW: Find or create a thread for a listing between two users
router.post('/find-or-create', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId, landlordId, currentUserId } = req.body;

    if (!listingId || !landlordId) {
      return res.status(400).json({ error: 'listingId and landlordId are required' });
    }

    // Try to find existing thread
    let thread = await MessageThread.findOne({
      listing: listingId,
      participants: { $all: [landlordId, userId] }
    });

    // If not found, create it
    if (!thread) {
      thread = await MessageThread.create({
        listing: listingId,
        participants: [landlordId, userId],
        lastMessage: ''
      });
    }

    res.json({ thread });
  } catch (err) {
    console.error('POST /messages/find-or-create error:', err);
    res.status(500).json({ error: 'Failed to find or create thread' });
  }
});

// Start or get an existing thread for a listing between two users
router.post('/start', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId, otherUserId, initialText } = req.body;
    if (!listingId || !otherUserId) return res.status(400).json({ error: 'listingId and otherUserId are required' });

    let thread = await MessageThread.findOne({
      listing: listingId,
      participants: { $all: [userId, otherUserId] }
    });

    if (!thread) {
      thread = await MessageThread.create({
        listing: listingId,
        participants: [userId, otherUserId],
        lastMessage: initialText || ''
      });
    }

    // Optional first message
    if (initialText) {
      const msg = await Message.create({
        thread: thread._id, sender: userId, text: initialText, seenBy: [userId]
      });
      thread.lastMessage = initialText;
      thread.updatedAt = new Date();
      await thread.save();

      // Notify via socket if available
      try {
        const { getIO } = require('../socket');
        const io = getIO();
        io.to(`thread:${thread._id}`).emit('message:new', { threadId: String(thread._id), message: msg });
        // Notify the other user
        io.to(`user:${otherUserId}`).emit('message:notify', { threadId: String(thread._id), preview: initialText });
      } catch (_) {}
    }

    res.json({ threadId: thread._id });
  } catch (err) {
    console.error('POST /messages/start error:', err);
    res.status(500).json({ error: 'Failed to start thread' });
  }
});

// List all threads for current user
router.get('/threads', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const threads = await MessageThread.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate('listing', 'title price')
      .lean();

    res.json({ threads });
  } catch (err) {
    console.error('GET /messages/threads error:', err);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// Get messages for a thread
router.get('/thread/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const threadId = req.params.id;

    const thread = await MessageThread.findById(threadId).lean();
    if (!thread || !thread.participants.map(String).includes(String(userId))) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const messages = await Message.find({ thread: threadId }).sort({ createdAt: 1 }).lean();
    res.json({ thread, messages });
  } catch (err) {
    console.error('GET /messages/thread/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// Send a message to a thread
router.post('/:id/send', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const threadId = req.params.id;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const thread = await MessageThread.findById(threadId);
    if (!thread || !thread.participants.map(String).includes(String(userId))) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const message = await Message.create({
      thread: threadId, sender: userId, text, seenBy: [userId]
    });

    thread.lastMessage = text;
    thread.updatedAt = new Date();
    await thread.save();

    try {
      const { getIO } = require('../socket');
      const io = getIO();
      io.to(`thread:${threadId}`).emit('message:new', { threadId: String(threadId), message });
      // Notify other participants (simple broadcast to user rooms)
      thread.participants.forEach(uid => {
        if (String(uid) !== String(userId)) {
          io.to(`user:${uid}`).emit('message:notify', { threadId: String(threadId), preview: text });
        }
      });
    } catch (_) {}

    res.json({ message });
  } catch (err) {
    console.error('POST /messages/:id/send error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;