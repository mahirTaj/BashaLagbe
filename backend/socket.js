// backend/socket.js
let ioInstance = null;

function initSocketIO(server, options = {}) {
  const { Server } = require('socket.io');
  const corsOrigin = process.env.SOCKET_CORS_ORIGIN || options.corsOrigin || '*';

  const io = new Server(server, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] }
  });
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('[socket] connected:', socket.id);

    // ✅ User room (for notifications)
    const { userId } = socket.handshake.query;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[socket] User ${userId} joined their room (via query)`);
    }

    // ✅ Manual room join (generic)
    socket.on('join', (room) => {
      console.log(`[socket] joining room via event: ${room}`);
      socket.join(room);
    });

    // ✅ Thread join for messaging
    socket.on('thread:join', (threadId) => {
      if (!threadId) return;
      socket.join(`thread:${threadId}`);
      console.log(`[socket] joined thread room: thread:${threadId}`);
    });

    // ✅ Thread leave for messaging
    socket.on('thread:leave', (threadId) => {
      if (!threadId) return;
      socket.leave(`thread:${threadId}`);
      console.log(`[socket] left thread room: thread:${threadId}`);
    });

    socket.on('disconnect', () => {
      console.log('[socket] disconnected:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}

module.exports = { initSocketIO, getIO };
