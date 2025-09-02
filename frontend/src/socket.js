// frontend/src/socket.js
import { io } from 'socket.io-client';

let socket;

export function getSocket(userId) {
  if (socket) return socket;

  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  socket = io(baseURL, { autoConnect: true });

  socket.on('connect', () => {
    console.log('[socket] connected:', socket.id);

    // 👇 Join personal room for notifications
    if (userId) {
      socket.emit('join', `user:${userId}`);
      console.log('[socket] joined room:', `user:${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected:', socket.id);
  });

  return socket;
}
