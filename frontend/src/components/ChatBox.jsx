import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export default function ChatBox({ listingId, receiverId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingStatus, setTypingStatus] = useState('');
  const socketRef = useRef(null);

  // Join room & set up listeners
  useEffect(() => {
    if (!listingId || !receiverId) return;

    // ✅ Auto-detect backend URL (works with or without frontend .env)
    const backendURL =
      (process.env.REACT_APP_SOCKET_SERVER && process.env.REACT_APP_SOCKET_SERVER.trim()) ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000'
        : window.location.origin);

    // Connect
    socketRef.current = io(backendURL, {
      withCredentials: true,
    });

    // Join a specific listing's room
    socketRef.current.emit('joinRoom', { listingId, receiverId });

    // Incoming message
    socketRef.current.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Typing indicator
    socketRef.current.on('typing', ({ from }) => {
      setTypingStatus(from === receiverId ? 'Typing...' : '');
    });

    // Read receipts
    socketRef.current.on('messageRead', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [listingId, receiverId]);

  // Handle send
  const handleSend = () => {
    if (!input.trim()) return;

    const messageData = {
      id: Date.now(), // temp ID for UI
      text: input,
      from: 'me',
      read: false,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, messageData]);

    // Emit to server
    socketRef.current.emit('sendMessage', {
      listingId,
      receiverId,
      text: input,
    });

    setInput('');
  };

  // Emit typing
  const handleTyping = () => {
    socketRef.current.emit('typing', { listingId, to: receiverId });
  };

  return (
    <div>
      <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #ccc', marginBottom: '0.5em' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ margin: '0.2em 0' }}>
            <strong>{msg.from === 'me' ? 'You' : 'Them'}:</strong> {msg.text}
            {msg.read && <span style={{ fontSize: '0.8em', color: 'green' }}> ✓✓</span>}
          </div>
        ))}
        {typingStatus && (
          <div style={{ fontStyle: 'italic', color: 'gray' }}>{typingStatus}</div>
        )}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleTyping}
        style={{ width: '80%' }}
      />
      <button onClick={handleSend} style={{ width: '18%', marginLeft: '2%' }}>
        Send
      </button>
    </div>
  );
}