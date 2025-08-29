// frontend/src/socket.js
import { io } from 'socket.io-client';
import { getToken } from './auth'; // assumes you expose a getToken()

let socket;

export function getSocket() {
  if (socket) return socket;
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  socket = io(baseURL, { autoConnect: true });

  socket.on('connect', () => {
    const token = getToken?.();
    if (token) socket.emit('auth', token);
  });

  return socket;
}