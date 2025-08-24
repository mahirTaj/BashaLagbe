import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function SlotsLanding() {
  const { user, role, setUserRole, token } = useAuth();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/listings', { headers: { 'x-user-id': user.id } });
        setListings(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, [user.id]);

  const [openListing, setOpenListing] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedRole, setSelectedRole] = useState(role || null);
  const [bookingForm, setBookingForm] = useState({ slotId: null, name: '', contact: '' });

  const toggleSlots = async (listing) => {
    if (openListing === listing._id) {
      setOpenListing(null);
      setSlots([]);
      return;
    }
    try {
      const res = await axios.get(`/api/bookings/listing/${listing._id}`);
      setSlots(res.data);
      setOpenListing(listing._id);
    } catch (err) {
      console.error(err);
    }
  };

  const bookSlot = async () => {
    try {
      const { slotId, name, contact } = bookingForm;
      await axios.post('/api/bookings/book', { slotId, tenantName: name, tenantContact: contact }, { headers: { Authorization: `Bearer ${token}` } });
      // mark locally
      setSlots(s => s.map(x => x._id === slotId ? { ...x, status: 'booked' } : x));
      setBookingForm({ slotId: null, name: '', contact: '' });
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div>
      {!selectedRole ? (
        <div>
          <h2>Who are you?</h2>
          <p>Select your role to continue</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn" onClick={() => { setSelectedRole('landlord'); setUserRole('landlord'); }}>I am a Landlord</button>
            <button className="btn" onClick={() => { setSelectedRole('tenant'); setUserRole('tenant'); }}>I am a Tenant</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Available Slots - {selectedRole === 'landlord' ? 'Landlord' : 'Tenant'}</h2>
            {selectedRole === 'landlord' && <Link to="/create-slot"><button className="btn">Create slot</button></Link>}
            <button className="btn" onClick={() => { setSelectedRole(null); setUserRole(null); }}>Change role</button>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {listings.map(l => (
              <div key={l._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b>{l.title}</b>
                    <div style={{ color: '#6b7280' }}>{l.area || l.location}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => toggleSlots(l)}>{openListing === l._id ? 'Hide slots' : 'View slots'}</button>
                    {selectedRole === 'landlord' && <Link to="/create-slot"><button className="btn">Create slot</button></Link>}
                  </div>
                </div>

                {openListing === l._id && (
                  <div style={{ marginTop: 12 }}>
                    {slots.length === 0 ? <div>No slots</div> : (
                      slots.map(s => (
                        <div key={s._id} style={{ padding: 8, border: '1px solid #eee', marginBottom: 8 }}>
                          <div>{new Date(s.slotStart).toLocaleString()} - {new Date(s.slotEnd).toLocaleString()}</div>
                          <div>Status: {s.status}</div>
                          {selectedRole === 'tenant' && s.status === 'available' && (
                            <div>
                              <div>
                                <input placeholder="Your name" value={bookingForm.slotId === s._id ? bookingForm.name : ''} onChange={e => setBookingForm(b => b.slotId === s._id ? { ...b, name: e.target.value } : { ...b, slotId: s._id, name: e.target.value })} />
                                <input placeholder="Contact (email or phone)" value={bookingForm.slotId === s._id ? bookingForm.contact : ''} onChange={e => setBookingForm(b => b.slotId === s._id ? { ...b, contact: e.target.value } : { ...b, slotId: s._id, contact: e.target.value })} />
                              </div>
                              <button className="btn" onClick={bookSlot}>Book</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
