import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ChatBox({ listingId, landlordId }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    axios.get(`/api/messages/${listingId}`).then(res => setMessages(res.data));
  }, [listingId]);

  const sendMessage = async () => {
    if (!content.trim()) return;
    const res = await axios.post('/api/messages', {
      listing: listingId,
      receiver: landlordId,
      content
    });
    setMessages(prev => [...prev, res.data]);
    setContent('');
  };

  return (
    <div className="chat-box">
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={m.sender === landlordId ? "msg landlord" : "msg user"}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input value={content} onChange={e => setContent(e.target.value)} placeholder="Type your message..." />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}