import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { getDivisions, getDistricts, getUpazilas } from '../data/bd-geo';

// Public browse/search page (not user restricted)
export default function Browse() {
  const location = useLocation();
  const navigate = useNavigate();
  const paramsIn = new URLSearchParams(location.search);
  const q = paramsIn.get('q') || '';
  const [type, setType] = useState('');
  // Removed For Rent / For Sale filter
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [area, setArea] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [roomsMin, setRoomsMin] = useState('');
  const [roomsMax, setRoomsMax] = useState('');
  const [bathroomsMin, setBathroomsMin] = useState('');
  const [bathroomsMax, setBathroomsMax] = useState('');
  const [personMin, setPersonMin] = useState('');
  const [personMax, setPersonMax] = useState('');
  const [balconyMin, setBalconyMin] = useState('');
  const [balconyMax, setBalconyMax] = useState('');
  const [serviceChargeMin, setServiceChargeMin] = useState('');
  const [serviceChargeMax, setServiceChargeMax] = useState('');
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
  // removed propertyType from params
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

  // Extended numeric params
  const numericExtendedParams = useMemo(() => {
    const p = {};
    const addRange = (minVal, maxVal, keyBase) => {
      const minN = minVal !== '' ? Number(minVal) : undefined;
      const maxN = maxVal !== '' ? Number(maxVal) : undefined;
      if (Number.isFinite(minN) && minN >= 0) p[`${keyBase}Min`] = minN;
      if (Number.isFinite(maxN) && maxN >= 0 && (minN === undefined || maxN >= minN)) p[`${keyBase}Max`] = maxN;
    };
    addRange(bathroomsMin, bathroomsMax, 'bathrooms');
    addRange(personMin, personMax, 'person');
    addRange(balconyMin, balconyMax, 'balcony');
    addRange(serviceChargeMin, serviceChargeMax, 'serviceCharge');
    return p;
  }, [bathroomsMin, bathroomsMax, personMin, personMax, balconyMin, balconyMax, serviceChargeMin, serviceChargeMax]);

  // Ensure max price never below min price in UI state
  useEffect(() => {
    if (priceMin !== '' && priceMax !== '' && Number(priceMax) < Number(priceMin)) {
      setPriceMax(priceMin); // snap up to min
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMin]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, [params, numericExtendedParams]);

  const fetch = async () => {
    setLoading(true); setError('');
    try {
  const res = await axios.get('/api/listings/search', { 
    params: { ...params, ...numericExtendedParams }
  });
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
  setPriceMin(''); setPriceMax(''); setRoomsMin(''); setRoomsMax('');
  setBathroomsMin(''); setBathroomsMax(''); setPersonMin(''); setPersonMax('');
  setBalconyMin(''); setBalconyMax(''); setServiceChargeMin(''); setServiceChargeMax('');
  setSort('newest'); setPage(1);
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
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 16,
        background: 'linear-gradient(135deg, #111827, #1f2937)', color: '#f3f4f6',
        boxShadow: '0 12px 28px rgba(0,0,0,0.18)'
      }}>
        <h2 style={{ margin: 0, letterSpacing: '.02em' }}>Browse Rentals</h2>
        <span style={{ fontSize: 12, opacity: .85 }}>{total} results</span>
      </div>
      <form onSubmit={e => { e.preventDefault(); setPage(1); fetch(); }} className="card" style={{ display: 'grid', gap: 16, padding: 16, borderRadius: 16, boxShadow: '0 14px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
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
          {/* Removed For Rent / For Sale dropdown */}
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
          <input placeholder="Min washrooms" type="number" min="0" step="1" value={bathroomsMin} onChange={e => { setBathroomsMin(e.target.value); setPage(1); }} />
          <input placeholder="Max washrooms" type="number" min="0" step="1" value={bathroomsMax} onChange={e => { setBathroomsMax(e.target.value); setPage(1); }} />
          <input placeholder="Min persons" type="number" min="0" step="1" value={personMin} onChange={e => { setPersonMin(e.target.value); setPage(1); }} />
          <input placeholder="Max persons" type="number" min="0" step="1" value={personMax} onChange={e => { setPersonMax(e.target.value); setPage(1); }} />
          <input placeholder="Min corridor/balcony" type="number" min="0" step="1" value={balconyMin} onChange={e => { setBalconyMin(e.target.value); setPage(1); }} />
          <input placeholder="Max corridor/balcony" type="number" min="0" step="1" value={balconyMax} onChange={e => { setBalconyMax(e.target.value); setPage(1); }} />
          <input placeholder="Min service charge" type="number" min="0" step="500" value={serviceChargeMin} onChange={e => { setServiceChargeMin(e.target.value); setPage(1); }} />
          <input placeholder="Max service charge" type="number" min="0" step="500" value={serviceChargeMax} onChange={e => { setServiceChargeMax(e.target.value); setPage(1); }} />
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn" style={{ borderRadius: 12, padding: '10px 16px', fontWeight: 700 }}>Search</button>
          <button type="button" className="btn ghost" onClick={resetFilters} style={{ borderRadius: 12, padding: '10px 16px', fontWeight: 700 }}>Reset</button>
        </div>
      </form>

      {loading ? <p>Loading...</p> : error ? <p style={{ color: 'red' }}>{error}</p> : items.length === 0 ? <div className="card" style={{ borderRadius: 16 }}>No results.</div> : (
        <div className="cards" style={{ gap: 16 }}>
          {items.map(l => (
            <Link key={l._id} to={`/listing/${l._id}`} className="card" style={{ display:'grid', gap: 10, textDecoration:'none', color:'inherit', minHeight: 280, borderRadius: 16, boxShadow: '0 14px 32px rgba(0,0,0,0.08)' }}>
              <div style={{ width: '100%', height: 180, background:'#f3f4f6', position:'relative', borderRadius:12, overflow:'hidden' }}>
                {l.photoUrls?.[0] ? (
                  <img src={l.photoUrls[0]} alt="thumb" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                ) : (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#777' }}>No Photo</div>
                )}
                {l.isRented && <span className="badge" style={{ position:'absolute', top:8, left:8, background:'#fff', color:'var(--success)', borderRadius: 10, padding: '4px 8px', fontWeight: 700 }}>Rented</span>}
              </div>
              <b style={{ lineHeight:1.25, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', fontSize: 16 }}>{l.title}</b>
              <div style={{ fontSize:12, color:'#666', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{[l.area,l.subdistrict,l.district,l.division].filter(Boolean).join(', ')}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
                  <span style={{ fontWeight:800, fontSize: 16 }}>৳{l.price}</span>
                <span style={{ fontSize:12, fontWeight: 600, opacity: .8 }}>{l.type}</span>
              </div>
            </Link>
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
