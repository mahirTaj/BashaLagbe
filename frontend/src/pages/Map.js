import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BD_BOUNDS = [
  [20.5, 88.0], // south-west [lat, lng]
  [26.7, 92.7], // north-east
];

function createHomeIcon() {
  const svg = `
    <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="rgba(0,0,0,0.35)" />
        </filter>
      </defs>
      <!-- Pin -->
      <path d="M12 2c-4.5 4.9-9 6.6-9 11.2A9 9 0 0012 22a9 9 0 009-8.8C21 8.6 16.5 6.9 12 2z" fill="#7c3aed" stroke="#5b21b6" stroke-width="1" filter="url(#drop)"/>
      <!-- House roof -->
      <path d="M7 12l5-4 5 4" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- House body -->
      <rect x="8.5" y="12.2" width="7" height="5.2" rx="0.8" fill="#ffffff"/>
      <!-- Door -->
      <rect x="11.2" y="13.8" width="1.8" height="3.6" rx="0.4" fill="#7c3aed"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: 'home-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32],
  });
}

function BoundsFetcher({ onBounds }) {
  useMapEvents({
    load() { onBounds(this.getBounds()); },
    moveend() { onBounds(this.getBounds()); },
    zoomend() { onBounds(this.getBounds()); },
  });
  return null;
}

export default function MapPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const centerDhaka = useMemo(() => ({ lat: 23.8103, lng: 90.4125 }), []);

  const fetchInBounds = async (b) => {
    if (!b) return;
    setLoading(true); setErr('');
    try {
      const params = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
      const res = await axios.get('/api/listings/in-bounds', { params });
      setItems(res.data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Failed to load map data');
    } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Map (Bangladesh)</h2>
      {err && <div className="card" style={{ color: 'red' }}>{err}</div>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MapContainer
          center={centerDhaka}
          zoom={12}
          style={{ height: 520 }}
          maxBounds={BD_BOUNDS}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsFetcher onBounds={fetchInBounds} />
          {items.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)).map((m) => (
            <Marker key={m._id} position={[m.lat, m.lng]} icon={createHomeIcon()}>
              <Popup>
                <div style={{ display: 'grid', gap: 6, minWidth: 200 }}>
                  <b style={{ lineHeight: 1.2 }}>{m.title}</b>
                  <div style={{ fontSize: 12, color: '#666' }}>{m.type}</div>
                  <div style={{ fontWeight: 700 }}>৳{m.price}</div>
                  <Link to={`/listing/${m._id}`} className="btn sm" style={{ width: 'fit-content' }}>
                    View details
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div style={{ fontSize: 12, color: '#555' }}>{loading ? 'Loading…' : `${items.length} markers`}</div>
    </div>
  );
}
