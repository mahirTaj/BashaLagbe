import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function MoveInScheduler() {
  const [listingId, setListingId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (listingId) fetchSlots();
    // eslint-disable-next-line
  }, [listingId]);

  async function fetchSlots() {
    setLoading(true);
    try {
      const res = await axios.get('/api/movein/slots', { params: { listingId } });
      setSlots(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function book(slotId) {
    try {
      // For now tenant id is sent via header in our dev flow
      const res = await axios.post('/api/movein/book', { slotId, tenantName: 'Guest Tenant' }, { headers: { 'x-user-id': 'tenant_demo' } });
      alert('Booked!');
      fetchSlots();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  }

  return (
    <div>
      <h2>Move-in Scheduler</h2>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="Listing ID" value={listingId} onChange={(e) => setListingId(e.target.value)} />
        <button onClick={fetchSlots} disabled={!listingId}>Load slots</button>
      </div>
      {loading && <div>Loading...</div>}
      <ul>
        {slots.map(({ slot, booked }) => (
          <li key={slot._id} style={{ marginBottom: 8 }}>
            <strong>{new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleString()}</strong>
            <div>Booked: {booked} / {slot.capacity}</div>
            <button disabled={booked >= slot.capacity} onClick={() => book(slot._id)}>Book</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
