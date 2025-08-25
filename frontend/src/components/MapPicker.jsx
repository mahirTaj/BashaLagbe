import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BD_BOUNDS = [
  [20.5, 88.0],
  [26.7, 92.7],
];

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function ClickSetter({ onPick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Clamp to Bangladesh
      const clamped = {
        lat: Math.max(20.5, Math.min(26.7, lat)),
        lng: Math.max(88.0, Math.min(92.7, lng)),
      };
      onPick(clamped);
    },
  });
  return null;
}

export default function MapPicker({ lat, lng, onChange, height = 280 }) {
  const center = useMemo(() => ({ lat: lat ?? 23.8103, lng: lng ?? 90.4125 }), [lat, lng]);

  const pick = (pos) => {
    if (!onChange) return;
    onChange(pos);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      pick({
        lat: Math.max(20.5, Math.min(26.7, latitude)),
        lng: Math.max(88.0, Math.min(92.7, longitude)),
      });
    });
  };

  const clear = () => pick({ lat: '', lng: '' });

  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Pick location (Bangladesh)</span>
        <button type="button" className="btn sm" onClick={useMyLocation}>Use my location</button>
        <button type="button" className="btn sm ghost" onClick={clear}>Clear</button>
      </div>
      <div style={{ height }}>
        <MapContainer
          center={center}
          zoom={hasPoint ? 14 : 7}
          style={{ height: '100%' }}
          maxBounds={BD_BOUNDS}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickSetter onPick={pick} />
          {hasPoint && (
            <Marker position={[lat, lng]} icon={markerIcon} />
          )}
        </MapContainer>
      </div>
      <div style={{ fontSize: 12, color: '#555' }}>
        {hasPoint ? `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}` : 'Click on the map to set coordinates'}
      </div>
    </div>
  );
}
