import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth';

export default function ListingSlots() {
  const { id } = useParams();
  const { token } = useAuth();
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState('');
  const [bookingForm, setBookingForm] = useState({ slotId: null, name: '', contact: '' });

  useEffect(() => {
    axios.get(`/api/bookings/listing/${id}`).then(r => setSlots(r.data)).catch(err => setMsg(err.message));
  }, [id]);

  const book = async () => {
    try {
      const { slotId, name, contact } = bookingForm;
      await axios.post('/api/bookings/book', { slotId, tenantName: name, tenantContact: contact }, { headers: { Authorization: `Bearer ${token}` } });
      setMsg('Booked successfully');
      setSlots(s => s.map(x => x._id === slotId ? { ...x, status: 'booked' } : x));
      setBookingForm({ slotId: null, name: '', contact: '' });
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    }
  };

  return (
    <div>
      <h2>Available Slots</h2>
      {slots.map(s => (
        <div key={s._id} style={{ border: '1px solid #ccc', marginBottom: 8, padding: 8 }}>
          <div>{new Date(s.slotStart).toLocaleString()} - {new Date(s.slotEnd).toLocaleString()}</div>
          <div>Status: {s.status}</div>
          {s.status === 'available' && (
            <div>
              <div>
                <input placeholder="Your name" value={bookingForm.slotId === s._id ? bookingForm.name : ''} onChange={e => setBookingForm(b => b.slotId === s._id ? { ...b, name: e.target.value } : { ...b, slotId: s._id, name: e.target.value })} />
                <input placeholder="Contact (email or phone)" value={bookingForm.slotId === s._id ? bookingForm.contact : ''} onChange={e => setBookingForm(b => b.slotId === s._id ? { ...b, contact: e.target.value } : { ...b, slotId: s._id, contact: e.target.value })} />
              </div>
              <button onClick={book}>Confirm booking</button>
            </div>
          )}
        </div>
      ))}
      <div>{msg}</div>
    </div>
  );
}
