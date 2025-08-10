import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDivisions, getDistricts, getUpazilas } from '../data/bd-geo';

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
    const minNum = priceMin !== '' ? Number(priceMin) : undefined;
    const maxNum = priceMax !== '' ? Number(priceMax) : undefined;
    if (Number.isFinite(minNum) && minNum >= 0) p.priceMin = minNum;
    if (Number.isFinite(maxNum) && maxNum >= 0 && (minNum === undefined || maxNum >= minNum)) p.priceMax = maxNum; // only if valid range
    const rMinNum = roomsMin !== '' ? Number(roomsMin) : undefined;
    const rMaxNum = roomsMax !== '' ? Number(roomsMax) : undefined;
    if (Number.isFinite(rMinNum) && rMinNum >= 0) p.roomsMin = rMinNum;
    if (Number.isFinite(rMaxNum) && rMaxNum >= 0 && (rMinNum === undefined || rMaxNum >= rMinNum)) p.roomsMax = rMaxNum;
    return p;
  }, [q, type, division, district, subdistrict, area, priceMin, priceMax, roomsMin, roomsMax, page, sort]);

  // Ensure max price never below min price in UI state
  useEffect(() => {
    if (priceMin !== '' && priceMax !== '' && Number(priceMax) < Number(priceMin)) {
      setPriceMax(priceMin); // snap up to min
    }
  }, [priceMin]);

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

  // Derived geographic option lists (cascading)
  const divisionOptions = useMemo(() => getDivisions(), []);
  const districtOptions = useMemo(() => division ? getDistricts(division) : [], [division]);
  const upazilaOptions = useMemo(() => (division && district) ? getUpazilas(division, district) : [], [division, district]);

  // Collect area suggestions from current items (simple unique extraction)
  const areaOptions = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.area) set.add(i.area); });
    return Array.from(set).slice(0, 30); // limit
  }, [items]);

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
          <div style={{ position:'relative' }}>
            <input list="divisionOptions" placeholder="Division" value={division} onChange={e => {
              const val = e.target.value; setDivision(val); setDistrict(''); setSubdistrict('');
            }} />
            <datalist id="divisionOptions">
              {divisionOptions.map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div style={{ position:'relative' }}>
            <input list="districtOptions" placeholder="District" value={district} disabled={!division} onChange={e => {
              const val = e.target.value; setDistrict(val); setSubdistrict('');
            }} />
            <datalist id="districtOptions">
              {districtOptions.map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div style={{ position:'relative' }}>
            <input list="upazilaOptions" placeholder="Subdistrict / Upazila" value={subdistrict} disabled={!district} onChange={e => setSubdistrict(e.target.value)} />
            <datalist id="upazilaOptions">
              {upazilaOptions.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          <div style={{ position:'relative' }}>
            <input list="areaOptions" placeholder="Area" value={area} onChange={e => setArea(e.target.value)} />
            <datalist id="areaOptions">
              {areaOptions.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>
          <input placeholder="Min price" type="number" min="0" step="500" value={priceMin} onChange={e => { setPriceMin(e.target.value); setPage(1); }} />
          <input placeholder="Max price" type="number" step="500" min={priceMin || 0} value={priceMax} onChange={e => { setPriceMax(e.target.value); setPage(1); }} />
          <input placeholder="Min rooms" type="number" min="0" step="1" value={roomsMin} onChange={e => { setRoomsMin(e.target.value); setPage(1); }} />
          <input placeholder="Max rooms" type="number" min="0" step="1" value={roomsMax} onChange={e => { setRoomsMax(e.target.value); setPage(1); }} />
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
