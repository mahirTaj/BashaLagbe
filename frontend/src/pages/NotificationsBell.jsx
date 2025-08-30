import { useEffect, useState } from 'react'; 
import io from 'socket.io-client';
import axios from 'axios';

export default function NotificationBell({ userId, token }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // fetch existing notifications
    axios.get(`${process.env.REACT_APP_API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setNotifications(res.data));

    // connect to socket
    const socket = io(process.env.REACT_APP_API_URL, { query: { userId } });

    socket.on('newNotification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => socket.disconnect();
  }, [userId, token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ✅ Mark notification as read
  const handleMarkRead = async (id) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  return (
    <div className="notification-bell" style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}>
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="dropdown" 
             style={{ 
               position: 'absolute', 
               top: '100%', 
               right: 0, 
               background: '#fff', 
               border: '1px solid #ccc', 
               width: '300px',
               maxHeight: '400px',
               overflowY: 'auto',
               zIndex: 1000
             }}>
          {notifications.length === 0 && <p>No notifications</p>}
          {notifications.map(n => (
            <div 
              key={n._id} 
              className={`notif ${n.isRead ? '' : 'unread'}`} 
              style={{ 
                padding: '10px', 
                borderBottom: '1px solid #eee', 
                background: n.isRead ? '#f9f9f9' : '#e6f7ff', 
                cursor: 'pointer' 
              }}
              onClick={() => handleMarkRead(n._id)}
            >
              <strong>{n.title}</strong>
              <p style={{ margin: 0 }}>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
