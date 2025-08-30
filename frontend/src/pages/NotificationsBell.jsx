// src/pages/NotificationBell.jsx
import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function NotificationBell({ userId, token }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch existing notifications
  useEffect(() => {
    if (!userId || !token) return;

    fetch('http://localhost:5000/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      })
      .catch(console.error);
  }, [userId, token]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!userId) return;

    const socket = io('http://localhost:5000', { auth: { token } });
    socket.emit('join', `user:${userId}`);

    // Listen for notifications from backend
    socket.on('notification', (notif) => { // changed from 'newNotification' to 'notification' to match backend emit
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('connect', () => console.log('[socket] connected:', socket.id));
    socket.on('disconnect', () => console.log('[socket] disconnected:', socket.id));

    return () => socket.disconnect();
  }, [userId, token]);

  // Handle click outside dropdown to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative', zIndex: 10000 }} ref={dropdownRef}>
      <div
        style={{ cursor: 'pointer', position: 'relative', fontSize: '1.5rem' }}
        onClick={() => setOpen(!open)}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -5,
            right: -5,
            background: 'red',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '0.7rem',
            zIndex: 10001
          }}>
            {unreadCount}
          </span>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          marginTop: 8,
          width: 300,
          maxHeight: 400,
          overflowY: 'auto',
          background: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          borderRadius: 8,
          zIndex: 10002
        }}>
          {notifications.length === 0 && (
            <div style={{ padding: 12, textAlign: 'center', color: '#555' }}>No notifications</div>
          )}
          {notifications.map(n => (
            <div
              key={n._id}
              style={{
                padding: 10,
                borderBottom: '1px solid #eee',
                backgroundColor: n.isRead ? 'white' : '#f0f8ff',
                cursor: 'pointer'
              }}
              onClick={() => {
                markAsRead(n._id);
                if (n.url) window.location.href = n.url;
              }}
            >
              <strong>{n.title}</strong>
              <div style={{ fontSize: '0.85rem', color: '#555' }}>{n.message}</div>
              <div style={{ fontSize: '0.7rem', color: '#999' }}>
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
