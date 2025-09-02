// frontend/src/socket.js
import { io } from 'socket.io-client';

let socket;

/**
 * Get a singleton socket connection.
 * Joins the user's room for real-time notifications.
 * 
 * @param {string} userId - The logged-in user's ID.
 */
export function getSocket(userId) {
  if (socket) return socket;

  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  socket = io(baseURL, { autoConnect: true });

  socket.on('connect', () => {
    console.log('[socket] connected:', socket.id);

    if (userId) {
      socket.emit('join', `user:${userId}`);
      console.log('[socket] joined room:', `user:${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected');
  });

  return socket;
}
