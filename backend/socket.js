// socket.js
module.exports = function configureSocket(io) {
  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // Join a specific conversation room
    socket.on('joinRoom', ({ listingId, receiverId }) => {
      const room = `${listingId}-${receiverId}`;
      socket.join(room);
      console.log(`📥 ${socket.id} joined ${room}`);
    });

    // Send message
    socket.on('sendMessage', ({ listingId, receiverId, text }) => {
      const room = `${listingId}-${receiverId}`;
      const messageData = {
        id: Date.now(),
        text,
        from: socket.id, // Replace with user ID if using auth
        read: false,
        createdAt: new Date(),
      };
      io.to(room).emit('receiveMessage', messageData);
    });

    // Typing indicator
    socket.on('typing', ({ listingId, to }) => {
      const room = `${listingId}-${to}`;
      socket.to(room).emit('typing', { from: to });
    });

    // Read receipts
    socket.on('markAsRead', ({ listingId, receiverId, messageId }) => {
      const room = `${listingId}-${receiverId}`;
      io.to(room).emit('messageRead', { messageId });
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });
};