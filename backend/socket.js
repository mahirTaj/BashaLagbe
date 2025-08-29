// backend/socket.js
const jwt = require('jsonwebtoken');
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

    // Client should emit 'auth' with token once connected
    socket.on('auth', (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { id: decoded.id || decoded._id };
        socket.join(`user:${socket.user.id}`);
        console.log('[socket] authenticated user:', socket.user.id);
        socket.emit('auth:ok');
      } catch (e) {
        console.warn('[socket] auth failed');
        socket.emit('auth:error', 'Invalid token');
      }
    });

    socket.on('thread:join', (threadId) => {
      if (!threadId) return;
      socket.join(`thread:${threadId}`);
      console.log('[socket] joined thread room:', threadId);
    });

    socket.on('typing', ({ threadId, isTyping }) => {
      if (!threadId) return;
      socket.to(`thread:${threadId}`).emit('typing', { threadId, isTyping: !!isTyping });
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