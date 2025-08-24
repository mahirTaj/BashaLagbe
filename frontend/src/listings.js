import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';

export default function Listings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusSeg, setStatusSeg] = useState('all'); // all | available | rented
  const [typeSeg, setTypeSeg] = useState('all'); // all | Apartment | Room | Sublet | Commercial | Hostel

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/listings', {
        headers: { 'x-user-id': user.id },
      });
      setListings(res.data);
    } catch (err) {
      alert('Error fetching listings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await axios.delete(`/api/listings/${id}`, { headers: { 'x-user-id': user.id } });
      setListings((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const filtered = listings.filter((l) => {
    const statusOk = statusSeg === 'all' || (statusSeg === 'rented' ? !!l.isRented : !l.isRented);
    const typeOk = typeSeg === 'all' || l.type === typeSeg;
    return statusOk && typeOk;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>My Listings</h2>
        <div className="segmented">
          <button className={`seg ${statusSeg === 'all' ? 'active' : ''}`} onClick={() => setStatusSeg('all')}>All</button>
          <button className={`seg ${statusSeg === 'available' ? 'active' : ''}`} onClick={() => setStatusSeg('available')}>Available</button>
          <button className={`seg ${statusSeg === 'rented' ? 'active' : ''}`} onClick={() => setStatusSeg('rented')}>Rented</button>
        </div>
        <div className="segmented">
          <button className={`seg ${typeSeg === 'all' ? 'active' : ''}`} onClick={() => setTypeSeg('all')}>All types</button>
          <button className={`seg ${typeSeg === 'Apartment' ? 'active' : ''}`} onClick={() => setTypeSeg('Apartment')}>Apartment</button>
          <button className={`seg ${typeSeg === 'Room' ? 'active' : ''}`} onClick={() => setTypeSeg('Room')}>Room</button>
          <button className={`seg ${typeSeg === 'Sublet' ? 'active' : ''}`} onClick={() => setTypeSeg('Sublet')}>Sublet</button>
          <button className={`seg ${typeSeg === 'Commercial' ? 'active' : ''}`} onClick={() => setTypeSeg('Commercial')}>Commercial</button>
          <button className={`seg ${typeSeg === 'Hostel' ? 'active' : ''}`} onClick={() => setTypeSeg('Hostel')}>Hostel</button>
        </div>
        <Link to="/add" style={{ marginLeft: 'auto' }}>
          <button className="btn">Add Listing</button>
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : listings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>You have no listings yet.</div>
    ) : (
        <div className="cards">
      {filtered.map((l) => (
            <div key={l._id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <div className="thumb" style={{ width: '100%', height: 160 }}>
                {l.photoUrls?.[0] ? <img src={l.photoUrls[0]} alt="thumb" /> : 'No Photo'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <b style={{ fontSize: 16 }}>{l.title}</b>
                {l.isRented && <span className="badge" style={{ color: 'var(--success)' }}>Rented</span>}
              </div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>
                {[
                  l.houseNo,
                  l.road,
                  l.area,
                  l.subdistrict,
                  l.district,
                  l.division,
                ].filter(Boolean).join(', ') || l.location}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>৳{l.price}</span> • {l.type}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn ghost" onClick={() => navigate(`/edit/${l._id}`)}>Edit</button>
                  {/* View slots removed */}
                  <button className="btn danger" onClick={() => handleDelete(l._id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
