import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth';
import { getDivisions, getDistricts, getUpazilas } from '../data/bd-geo';

const empty = {
  title: '',
  description: '',
  type: 'Apartment',
  price: '',
  availableFrom: '',
  rooms: '',
  bathrooms: '',
  balcony: '',
  personCount: '',
  features: '', // comma separated in UI
  isRented: false,
};

export default function AddEditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState([]); // string URLs
  const [keepPhoto, setKeepPhoto] = useState({}); // url -> bool
  const [newPhotos, setNewPhotos] = useState([]); // File[]
  const [videoUrl, setVideoUrl] = useState(''); // existing video url
  const [newVideo, setNewVideo] = useState(null); // File | null
  const [dragActive, setDragActive] = useState(false);
  const maxPhotos = 12;

  const keepCount = useMemo(
    () => existingPhotos.filter((u) => keepPhoto[u]).length,
    [existingPhotos, keepPhoto]
  );
  const remainingSlots = Math.max(0, maxPhotos - keepCount - newPhotos.length);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await axios.get(`/api/listings/${id}`, { headers: { 'x-user-id': user.id } });
        const data = res.data;
        setForm({
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'Apartment',
          price: data.price ?? '',
          availableFrom: data.availableFrom ? data.availableFrom.substring(0, 10) : '',
          rooms: data.rooms ?? '',
          bathrooms: data.bathrooms ?? '',
          balcony: data.balcony ?? '',
          personCount: data.personCount ?? '',
          features: (data.features || []).join(', '),
          isRented: !!data.isRented,
          division: data.division || '',
          district: data.district || '',
          subdistrict: data.subdistrict || '',
          area: data.area || '',
          road: data.road || '',
          houseNo: data.houseNo || '',
        });
        setExistingPhotos(data.photoUrls || []);
        setKeepPhoto(Object.fromEntries((data.photoUrls || []).map((u) => [u, true])));
        setVideoUrl(data.videoUrl || '');
      } catch (e) {
        alert('Failed to load listing');
      }
    })();
  }, [id, user.id]);

  const photoPreviews = useMemo(() => newPhotos.map((f) => URL.createObjectURL(f)), [newPhotos]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Handle cascading resets
    if (name === 'division') {
      setForm(f => ({ ...f, division: value, district: '', subdistrict: '' }));
      return;
    }
    if (name === 'district') {
      setForm(f => ({ ...f, district: value, subdistrict: '' }));
      return;
    }
    if (name === 'price') {
      const n = Number(value);
      return setForm(f => ({ ...f, price: Number.isNaN(n) ? '' : Math.max(0, n) }));
    }
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const addNewPhotos = (files) => {
    if (!files?.length) return;
    const images = files.filter((f) => f.type?.startsWith('image/'));
    if (images.length === 0) return;
    setNewPhotos((prev) => {
      const allowed = Math.max(0, maxPhotos - keepCount - prev.length);
      if (allowed <= 0) return prev;
      return [...prev, ...images.slice(0, allowed)];
    });
  };

  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    addNewPhotos(files);
    e.target.value = '';
  };

  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    addNewPhotos(files);
  };

  const removeNewPhoto = (idx) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const onPickVideo = (e) => {
    const file = e.target.files?.[0];
    setNewVideo(file || null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // Require at least 1 photo (kept existing + new)
    const totalPhotos = existingPhotos.filter((u) => keepPhoto[u]).length + newPhotos.length;
    if (totalPhotos < 1) {
      alert('Please add at least one photo.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      const baseFields = {
        title: form.title,
        description: form.description,
        type: form.type,
        price: String(Number(form.price || 0)),
        availableFrom: form.availableFrom || '',
        rooms: String(Number(form.rooms || 0)),
        bathrooms: String(Number(form.bathrooms || 0)),
        balcony: String(Number(form.balcony || 0)),
        personCount: String(Number(form.personCount || 1)),
        features: form.features,
        isRented: String(!!form.isRented),
        division: form.division || '',
        district: form.district || '',
        subdistrict: form.subdistrict || '',
        area: form.area || '',
        road: form.road || '',
        houseNo: form.houseNo || '',
        deposit: String(Number(form.deposit || 0)),
        serviceCharge: String(Number(form.serviceCharge || 0)),
        negotiable: String(!!form.negotiable),
        floor: String(Number(form.floor || 0)),
        totalFloors: String(Number(form.totalFloors || 0)),
        furnishing: form.furnishing || 'Unfurnished',
        utilitiesIncluded: form.utilitiesIncluded || '',
        contactName: form.contactName || '',
        phone: form.phone || '',
      };
      Object.entries(baseFields).forEach(([k, v]) => fd.append(k, v));

      // Existing photos to keep
      const keepUrls = existingPhotos.filter((u) => keepPhoto[u]);
      fd.append('existingPhotoUrls', JSON.stringify(keepUrls));
      // New photos
      newPhotos.forEach((file) => fd.append('photos', file));
      // Optional new video (replace old)
      if (newVideo) fd.append('video', newVideo);

      const headers = { 'x-user-id': user.id };
      if (id) await axios.put(`/api/listings/${id}`, fd, { headers });
      else await axios.post('/api/listings', fd, { headers });
      navigate('/');
    } catch (e) {
      alert('Save failed');
    } finally {
      setLoading(false);
    }
  };

  const isEdit = Boolean(id);
  return (
    <div className="card" style={{ maxWidth: 960, margin: '20px auto' }}>
      <h2 style={{ marginTop: 0 }}>{isEdit ? 'Edit Listing' : 'Add Listing'}</h2>
      <form onSubmit={onSubmit} className="grid cols-2" style={{ gap: 16 }}>
        <label>
          Title<span className="req-star">*</span>
          <input name="title" value={form.title} onChange={onChange} required />
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={onChange} rows={4} />
        </label>
        <label>
          Listing Type<span className="req-star">*</span>
          <select name="type" value={form.type} onChange={onChange} required>
            <option>Apartment</option>
            <option>Room</option>
            <option>Sublet</option>
            <option>Commercial</option>
            <option>Hostel</option>
          </select>
        </label>
        <label>
          Rent Price<span className="req-star">*</span>
          <input type="number" name="price" min="0" step="1" value={form.price} onChange={onChange} required />
        </label>
        <label>
          Available From<span className="req-star">*</span>
          <input type="date" name="availableFrom" value={form.availableFrom} onChange={onChange} required />
        </label>
        <label>
          Rooms<span className="req-star">*</span>
          <input type="number" name="rooms" min="0" step="1" value={form.rooms} onChange={onChange} required />
        </label>
        <label>
          Bathrooms
          <input type="number" name="bathrooms" value={form.bathrooms} onChange={onChange} />
        </label>
        <label>
          Balcony
          <input type="number" name="balcony" value={form.balcony} onChange={onChange} />
        </label>
        <label>
          Person Count
          <input type="number" name="personCount" value={form.personCount} onChange={onChange} />
        </label>
        <label>
          Features (comma separated)
          <input name="features" value={form.features} onChange={onChange} />
        </label>

        {/* Address (structured) */}
        <div style={{ gridColumn: '1 / -1' }}>
      <b>Address</b>
          <div className="grid cols-2" style={{ marginTop: 8 }}>
            <label>
        Division<span className="req-star">*</span>
        <select name="division" value={form.division || ''} onChange={onChange} required>
                <option value="">Select division</option>
                {getDivisions().map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label>
        District<span className="req-star">*</span>
        <select name="district" value={form.district || ''} onChange={onChange} disabled={!form.division} required>
                <option value="">Select district</option>
                {getDistricts(form.division).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label>
        Subdistrict<span className="req-star">*</span>
        <select name="subdistrict" value={form.subdistrict || ''} onChange={onChange} disabled={!form.district} required>
                <option value="">Select subdistrict</option>
                {getUpazilas(form.division, form.district).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            <label>
        Area<span className="req-star">*</span>
        <input name="area" value={form.area || ''} onChange={onChange} required />
            </label>
            <label>
              Road
              <input name="road" value={form.road || ''} onChange={onChange} />
            </label>
            <label>
              House No
              <input name="houseNo" value={form.houseNo || ''} onChange={onChange} />
            </label>
          </div>
        </div>

        {/* Media section */}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <b>Photos<span className="req-star">*</span></b>
              <span className="badge">{maxPhotos - remainingSlots}/{maxPhotos}</span>
            </div>
            <label
              className={`dropzone ${dragActive ? 'active' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input type="file" accept="image/*" multiple onChange={onPickPhotos} hidden />
              {remainingSlots > 0 ? `Click or drop images (up to ${remainingSlots} more)` : 'Photo limit reached'}
            </label>
          </div>

          {/* Existing photos with keep toggles */}
          {existingPhotos.length > 0 && (
            <div className="thumb-grid">
              {existingPhotos.map((u) => (
                <label key={u} className="thumb-card">
                  <img src={u} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: 6, fontSize: 12, background: '#fff' }}>
                    <input type="checkbox" checked={!!keepPhoto[u]} onChange={(e) => setKeepPhoto((m) => ({ ...m, [u]: e.target.checked }))} /> keep
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* New photo previews */}
          {photoPreviews.length > 0 && (
            <div className="thumb-grid">
              {photoPreviews.map((u, i) => (
                <div key={i} className="thumb-card">
                  <img src={u} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                  <button type="button" className="thumb-remove" title="Remove" onClick={() => removeNewPhoto(i)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video */}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>Video</b>
            <label className="dropzone">
              <input type="file" accept="video/*" onChange={onPickVideo} hidden />
              Click to select a video (optional)
            </label>
          </div>
          {newVideo ? (
            <p style={{ fontSize: 12, color: '#666' }}>{newVideo.name}</p>
          ) : videoUrl ? (
            <video src={videoUrl} controls style={{ width: '100%', maxHeight: 240 }} />
          ) : null}
        </div>
        {isEdit && (
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" name="isRented" checked={form.isRented} onChange={onChange} />
            Mark as rented
          </label>
        )}

        {/* Pricing & terms (optional) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <b>Pricing & Terms</b>
          <div className="grid cols-2" style={{ marginTop: 8 }}>
            <label>
              Security deposit
              <input type="number" name="deposit" min="0" step="1" value={form.deposit || ''} onChange={onChange} />
            </label>
            <label>
              Service charge
              <input type="number" name="serviceCharge" min="0" step="1" value={form.serviceCharge || ''} onChange={onChange} />
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" name="negotiable" checked={!!form.negotiable} onChange={onChange} />
              Negotiable
            </label>
          </div>
        </div>

        {/* Extra details (optional) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <b>Extra details</b>
          <div className="grid cols-2" style={{ marginTop: 8 }}>
            <label>
              Floor<span className="req-star">*</span>
              <input type="number" name="floor" min="0" step="1" value={form.floor || ''} onChange={onChange} required />
            </label>
            <label>
              Total floors
              <input type="number" name="totalFloors" min="0" step="1" value={form.totalFloors || ''} onChange={onChange} />
            </label>
            <label>
              Furnishing
              <select name="furnishing" value={form.furnishing || 'Unfurnished'} onChange={onChange}>
                <option>Unfurnished</option>
                <option>Semi-furnished</option>
                <option>Furnished</option>
              </select>
            </label>
            <label>
              Utilities included (comma separated)
              <input name="utilitiesIncluded" value={form.utilitiesIncluded || ''} onChange={onChange} placeholder="e.g., water, gas, internet" />
            </label>
          </div>
        </div>

        {/* Contact (optional) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <b>Contact</b>
          <div className="grid cols-2" style={{ marginTop: 8 }}>
            <label>
              Contact name
              <input name="contactName" value={form.contactName || ''} onChange={onChange} />
            </label>
            <label>
              Phone<span className="req-star">*</span>
              <input name="phone" value={form.phone || ''} onChange={onChange} placeholder="01XXXXXXXXX" required />
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button className="btn ghost" type="button" onClick={() => navigate('/')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
