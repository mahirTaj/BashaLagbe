// frontend/src/socket.js
import { io } from 'socket.io-client';

let socket;

export function getSocket(userId) {
  if (socket) return socket;

  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // ✅ Pass userId in query so backend auto-joins `user:${userId}`
  socket = io(baseURL, {
    autoConnect: true,
    query: { userId }
  });

  socket.on('connect', () => {
    console.log('[socket] connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected:', socket.id);
  });

  // ✅ Debug listeners
  socket.on('newNotification', (notif) => {
    console.log('[socket] newNotification:', notif);
  });

  socket.on('message:notify', (msg) => {
    console.log('[socket] message:notify:', msg);
  });

  return socket;
}
