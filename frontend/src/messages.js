// frontend/src/messages.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 🔑 helper: normalize ID as string
function asString(v) {
  if (!v) return null;
  if (typeof v === 'object' && v._id) return String(v._id); // handle { _id, name }
  return String(v);
}

export async function startThread({ listingId, otherUserId, initialText }) {
  const res = await fetch(`${API_URL}/api/messages/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      listingId: asString(listingId),
      otherUserId: asString(otherUserId),
      initialText,
    }),
  });
  if (!res.ok) throw new Error('Failed to start thread');
  return res.json();
}

export async function getThreads() {
  const res = await fetch(`${API_URL}/api/messages/threads`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch threads');
  return res.json();
}

export async function getThread(threadId) {
  const res = await fetch(`${API_URL}/api/messages/thread/${asString(threadId)}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch thread');
  return res.json();
}

export async function sendMessage(threadId, text) {
  const res = await fetch(`${API_URL}/api/messages/${asString(threadId)}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

/* ✅ Fetch all messages for a thread (used by ChatBox if no initialMessages) */
export async function fetchMessages(threadId) {
  const res = await fetch(`${API_URL}/api/messages/${asString(threadId)}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

/* ✅ Find existing thread or create one (used by ContactLandlordButton) */
export async function findOrCreateThread({ listingId, landlordId, currentUserId }) {
  const res = await fetch(`${API_URL}/api/messages/find-or-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      listingId: asString(listingId),
      landlordId: asString(landlordId),
      currentUserId: asString(currentUserId),
    }),
  });
  if (!res.ok) throw new Error('Failed to find or create thread');
  return res.json();
}
