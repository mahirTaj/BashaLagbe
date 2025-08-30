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

    // ✅ Get userId from query directly
    const { userId } = socket.handshake.query;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[socket] User ${userId} joined their room`);
    }

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
