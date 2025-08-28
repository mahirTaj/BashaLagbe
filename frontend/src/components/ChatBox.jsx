import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ChatBox({ listingId, receiverId }) {
  // Alias for backward compatibility if any part of your app still calls it landlordId
  const landlordId = receiverId;

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchMessages = async () => {
    if (!listingId) return; // avoid API calls if ID is missing
    try {
      const res = await axios.get(`/api/messages/${listingId}`, { headers: authHeaders() });
      setMessages(res.data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000); // auto-refresh every 4s
    return () => clearInterval(interval);
  }, [listingId]);

  const sendMessage = async () => {
    if (!content.trim() || !landlordId) return;
    try {
      const res = await axios.post(
        '/api/messages',
        { listing: listingId, receiver: landlordId, content },
        { headers: authHeaders() }
      );
      setMessages(prev => [...prev, res.data]);
      setContent('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className="chat-box">
      <div className="messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.sender?._id === landlordId || m.sender === landlordId
                ? "msg landlord"
                : "msg user"
            }
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}