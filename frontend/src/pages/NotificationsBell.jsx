import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

export default function NotificationBell({ userId, token }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setNotifications(res.data));

    const socket = io(process.env.REACT_APP_API_URL, { query: { userId } });

    socket.on('newNotification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => socket.disconnect();
  }, [userId, token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notification-bell">
      <button>
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      <div className="dropdown">
        {notifications.map(n => (
          <div key={n._id} className={`notif ${n.isRead ? '' : 'unread'}`}>
            <strong>{n.title}</strong>
            <p>{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}