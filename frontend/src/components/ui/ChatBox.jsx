// frontend/src/components/ui/ChatBox.jsx
import React, { useEffect, useRef, useState } from 'react';
import { sendMessage, fetchMessages } from '../../messages'; // ✅ added fetchMessages
import { getSocket } from '../../socket';

export default function ChatBox({ threadId, initialThread, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  // ✅ NEW: fetch messages if threadId exists but no initialMessages
  useEffect(() => {
    if (threadId && (!initialMessages || initialMessages.length === 0)) {
      (async () => {
        try {
          const msgs = await fetchMessages(threadId);
          setMessages(msgs || []);
        } catch (err) {
          console.error('Failed to fetch messages:', err);
        }
      })();
    }
  }, [threadId, initialMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  useEffect(() => {
    const socket = getSocket();

    // ✅ NEW: join the thread room for real-time updates
    if (threadId) {
      socket.emit('thread:join', { threadId });
    }

    const onNewMessage = ({ threadId: tid, message }) => {
      if (String(tid) !== String(threadId)) return;
      setMessages(prev => [...prev, message]);
    };

    const onTyping = ({ threadId: tid, isTyping }) => {
      if (String(tid) !== String(threadId)) return;
      setTyping(!!isTyping);
    };

    socket.on('message:new', onNewMessage);
    socket.on('typing', onTyping);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing', onTyping);
      // ✅ leave room on unmount
      if (threadId) {
        socket.emit('thread:leave', { threadId });
      }
    };
  }, [threadId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      const { message } = await sendMessage(threadId, text);
      // Optimistic update in case socket echo is delayed
      setMessages(prev => [...prev, message]);
    } catch (e) {
      console.error('sendMessage error:', e);
      alert('Failed to send message.');
    }
  };

  const handleTyping = (val) => {
    setInput(val);
    const socket = getSocket();
    socket.emit('typing', { threadId, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { threadId, isTyping: false });
    }, 800);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b">
        <div className="text-sm text-gray-600">
          {initialThread?.listing ? 'Listing chat' : 'Conversation'}
        </div>
        {typing && <div className="text-xs text-indigo-500">Typing...</div>}
      </header>

      <section className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.map(m => (
          <div
            key={m._id}
            className={`max-w-[70%] p-2 rounded-lg ${
              isMine(m.sender) ? 'ml-auto bg-indigo-600 text-white' : 'bg-white border'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap">{m.text}</div>
            <div className="text-[10px] mt-1 opacity-70">
              {new Date(m.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-sm text-gray-500">No messages yet. Say hi!</div>
        )}
        <div ref={bottomRef} />
      </section>

      <footer className="p-3 border-t flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' ? handleSend() : undefined}
          placeholder="Write a message..."
          className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Send
        </button>
      </footer>
    </div>
  );
}

// Simple helper that reads your user id from localStorage JWT (if you store it)
// For demo safety, fallback to false if not available
function isMine(senderId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const myId = payload.id || payload._id;
    return String(senderId) === String(myId);
  } catch {
    return false;
  }
}