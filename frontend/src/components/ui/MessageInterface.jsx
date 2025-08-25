import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

export default function MessageInterface() {
  const location = useLocation();
  const { state } = location || {};

  // Demo default — in real app, replace currentUser with logged-in user
  const currentUser = state?.currentUser || 'Alice';
  const otherUser = state?.recipient || 'Bob';

  const [message, setMessage] = useState(state?.prefill || '');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/messages', {
        params: { user: currentUser, other: otherUser }
      });
      setMessages(res.data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await axios.post('/api/messages', {
        from: currentUser,
        to: otherUser,
        message
      });
      setMessage('');
      fetchMessages();
      window.dispatchEvent(new Event('messagesUpdated'));
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const handleUpdate = () => fetchMessages();
    window.addEventListener('messagesUpdated', handleUpdate);
    return () => window.removeEventListener('messagesUpdated', handleUpdate);
  }, [currentUser, otherUser]);

  return (
    <div style={{ padding: '1em', border: '1px solid #ccc' }}>
      <h2>{currentUser} ↔ {otherUser}</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {messages.map((m, idx) => (
            <li key={idx}>
              <strong>{m.from}:</strong> {m.text}
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: '1em' }}>
        <textarea
          rows="3"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={`Message ${otherUser}...`}
          style={{ width: '100%' }}
        />
        <br />
        <button onClick={sendMessage} style={{ marginTop: '0.5em' }}>
          Send
        </button>
      </div>
    </div>
  );
}