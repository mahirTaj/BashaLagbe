import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../auth';
import { useParams, useLocation } from 'react-router-dom'; // ⬅ added useLocation
import { Link } from 'react-router-dom';

export default function MessageInterface() {
  const { user } = useAuth();
  const { landlordId } = useParams(); // expecting /messages/:landlordId
  const location = useLocation(); // ⬅ added
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // ⬅ NEW: read listing title from query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const listingTitle = params.get('listing');
    if (listingTitle) {
      setNewMsg(`Hi, I’m interested in your listing: ${listingTitle}`);
    }
  }, [location.search]);

  useEffect(() => {
    if (!user) return;
    axios
      .get(`/api/messages?landlordId=${landlordId}&userId=${user.id}`)
      .then(res => setMessages(res.data))
      .catch(err => console.error('Error fetching messages:', err))
      .finally(() => setLoading(false));
  }, [landlordId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    try {
      const res = await axios.post('/api/messages', {
        from: user.id,
        to: landlordId,
        content: newMsg
      });
      setMessages(prev => [...prev, res.data]);
      setNewMsg('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white shadow rounded-lg flex flex-col h-[70vh]">
        <div className="p-4 border-b font-semibold text-lg">
          Chat with Landlord
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading ? (
            <p className="text-gray-500">Loading conversation...</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[70%] px-4 py-2 rounded-lg ${
                  msg.from === user.id
                    ? 'bg-blue-600 text-white ml-auto'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t flex gap-2">
          <input
            type="text"
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}