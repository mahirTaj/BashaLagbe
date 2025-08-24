import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';
import { useEffect } from 'react';

export default function CreateSlot() {
  const { token } = useAuth();
  const [listingId, setListingId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [msg, setMsg] = useState('');
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    // load current user's listings for dropdown
    const fetch = async () => {
      try {
        const res = await axios.get('/api/listings', { headers: { 'x-user-id': token ? (token === 'token_a' ? 'user_a' : token === 'token_b' ? 'user_b' : '') : '' } });
        setMyListings(res.data || []);
      } catch (err) {
        console.error('Failed to load listings', err);
      }
    };
    fetch();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    // client-side validation
    if (!listingId) return setMsg('Please select a listing');
    if (!start || !end) return setMsg('Please provide start and end date/time');
    const s = new Date(start);
    const eDate = new Date(end);
    const now = new Date();
    if (s >= eDate) return setMsg('Start must be before end');
    if (s < now) return setMsg('Start time cannot be in the past');

    try {
      const res = await axios.post('/api/bookings/create', { listingId, slotStart: s.toISOString(), slotEnd: eDate.toISOString() }, { headers: { Authorization: `Bearer ${token}` } });
      setMsg('Slot created');
      // clear
      setListingId(''); setStart(''); setEnd('');
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    }
  };

  return (
    <div>
      <h2>Create Available Slot</h2>
      <form onSubmit={submit}>
        <div>
          <label>Listing</label>
          <select value={listingId} onChange={e => setListingId(e.target.value)}>
            <option value="">-- select listing --</option>
            {myListings.map(l => <option key={l._id} value={l._id}>{l.title} ({l._id})</option>)}
          </select>
        </div>
        <div>
          <label>Start</label>
          <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div>
          <label>End</label>
          <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
        <button type="submit">Create slot</button>
      </form>
      <div>{msg}</div>
    </div>
  );
}
