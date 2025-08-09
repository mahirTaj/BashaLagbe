import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

// Public browse/search page (not user restricted)
export default function Browse() {
  const location = useLocation();
  const navigate = useNavigate();
  const paramsIn = new URLSearchParams(location.search);
  const q = paramsIn.get('q') || '';
  const [type, setType] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [area, setArea] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [roomsMin, setRoomsMin] = useState('');
  const [roomsMax, setRoomsMax] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const limit = 20;

  const params = useMemo(() => {
    const p = { page, limit, sort };
    if (q) p.q = q;
    if (type) p.type = type;
    if (division) p.division = division;
    if (district) p.district = district;
    if (subdistrict) p.subdistrict = subdistrict;
    if (area) p.area = area;
    if (priceMin) p.priceMin = priceMin;
    if (priceMax) p.priceMax = priceMax;
    if (roomsMin) p.roomsMin = roomsMin;
    if (roomsMax) p.roomsMax = roomsMax;
    return p;
  }, [q, type, division, district, subdistrict, area, priceMin, priceMax, roomsMin, roomsMax, page, sort]);

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [params]);

  const fetch = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get('/api/listings/search', { params });
      setItems(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Search failed');
    } finally { setLoading(false); }
  };

  const resetFilters = () => {
  // Clear URL search param q
  const p = new URLSearchParams(location.search); p.delete('q');
  navigate({ pathname: '/browse', search: p.toString() }, { replace: true });
  setType(''); setDivision(''); setDistrict(''); setSubdistrict(''); setArea('');
    setPriceMin(''); setPriceMax(''); setRoomsMin(''); setRoomsMax(''); setSort('newest'); setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Browse Rentals</h2>
      <form onSubmit={e => { e.preventDefault(); setPage(1); fetch(); }} className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="">All types</option>
            <option>Apartment</option>
            <option>Room</option>
            <option>Sublet</option>
            <option>Commercial</option>
            <option>Hostel</option>
          </select>
          <input placeholder="Division" value={division} onChange={e => setDivision(e.target.value)} />
          <input placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} />
            <input placeholder="Subdistrict" value={subdistrict} onChange={e => setSubdistrict(e.target.value)} />
          <input placeholder="Area" value={area} onChange={e => setArea(e.target.value)} />
          <input placeholder="Min price" type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
          <input placeholder="Max price" type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
          <input placeholder="Min rooms" type="number" value={roomsMin} onChange={e => setRoomsMin(e.target.value)} />
          <input placeholder="Max rooms" type="number" value={roomsMax} onChange={e => setRoomsMax(e.target.value)} />
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn">Search</button>
          <button type="button" className="btn ghost" onClick={resetFilters}>Reset</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#555' }}>{total} results</span>
        </div>
      </form>

      {loading ? <p>Loading...</p> : error ? <p style={{ color: 'red' }}>{error}</p> : items.length === 0 ? <div className="card">No results.</div> : (
        <div className="cards">
          {items.map(l => (
            <div key={l._id} className="card" style={{ display:'grid', gap: 8 }}>
              <div style={{ width: '100%', height: 140, background:'#f3f4f6', position:'relative' }}>
                {l.photoUrls?.[0] && <img src={l.photoUrls[0]} alt="thumb" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
                {l.isRented && <span className="badge" style={{ position:'absolute', top:6, left:6, background:'#fff', color:'var(--success)' }}>Rented</span>}
              </div>
              <b>{l.title}</b>
              <div style={{ fontSize:12, color:'#666' }}>{[l.area,l.subdistrict,l.district,l.division].filter(Boolean).join(', ')}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:600 }}>৳{l.price}</span>
                <span style={{ fontSize:12 }}>{l.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <button className="btn ghost" disabled={page===1} onClick={()=> setPage(p=>p-1)}>Prev</button>
          <span style={{ fontSize:12 }}>Page {page} / {totalPages}</span>
          <button className="btn ghost" disabled={page===totalPages} onClick={()=> setPage(p=>p+1)}>Next</button>
        </div>
      )}
    </div>
  );
}
