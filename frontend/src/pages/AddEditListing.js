import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth';
import { getDivisions, getDistricts, getUpazilas } from '../data/bd-geo';
import { Box, Paper, Grid, TextField, Select, MenuItem, FormControl, InputLabel, Button, Typography, Checkbox, FormControlLabel, Chip, Stack, Tabs, Tab } from '@mui/material';
import MapPicker from '../components/MapPicker';

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
  lat: '',
  lng: '',
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
  const newVideoPreview = useMemo(() => (newVideo ? URL.createObjectURL(newVideo) : ''), [newVideo]);
  useEffect(() => {
    return () => {
      // revoke object URL when file changes/unmounts
      if (newVideoPreview) URL.revokeObjectURL(newVideoPreview);
    };
  }, [newVideoPreview]);
  const [dragActive, setDragActive] = useState(false);
  const [removeVideo, setRemoveVideo] = useState(false);
  const maxPhotos = 12;
  const [tab, setTab] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const keepCount = useMemo(
    () => existingPhotos.filter((u) => keepPhoto[u]).length,
    [existingPhotos, keepPhoto]
  );
  const remainingSlots = Math.max(0, maxPhotos - keepCount - newPhotos.length);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await axios.get(`/api/listings/${id}`, { 
          headers: { 
            ...(localStorage.getItem('authToken') ? {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`
            } : {})
          } 
        });
        const data = res.data;
        // Robustly format date to YYYY-MM-DD for the date input
        const toYMD = (val) => {
          if (!val) return '';
          try {
            const d = new Date(val);
            if (Number.isNaN(d.getTime())) return '';
            return d.toISOString().slice(0, 10);
          } catch {
            return '';
          }
        };
        setForm({
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'Apartment',
          price: data.price ?? '',
          availableFrom: toYMD(data.availableFrom),
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
          // Pricing & terms
          deposit: data.deposit ?? '',
          serviceCharge: data.serviceCharge ?? '',
          negotiable: !!data.negotiable,
          // Extra details
          floor: data.floor ?? '',
          totalFloors: data.totalFloors ?? '',
          furnishing: data.furnishing || 'Unfurnished',
          utilitiesIncluded: (data.utilitiesIncluded || []).join(', '),
          sizeSqft: data.sizeSqft ?? '',
          // Contact
          contactName: data.contactName || '',
          phone: data.phone || '',
          lat: typeof data.lat === 'number' ? String(data.lat) : '',
          lng: typeof data.lng === 'number' ? String(data.lng) : '',
        });
        setExistingPhotos(data.photoUrls || []);
        setKeepPhoto(Object.fromEntries((data.photoUrls || []).map((u) => [u, true])));
        setVideoUrl(data.videoUrl || '');
        setNewVideo(null);
        setRemoveVideo(false);
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
    if (name === 'lat' || name === 'lng') {
      if (value === '') return setForm(f => ({ ...f, [name]: '' }));
      const n = Number(value);
      if (!Number.isFinite(n)) return; // ignore invalid
      if (name === 'lat') {
        const clamped = Math.max(20.5, Math.min(26.7, n));
        return setForm(f => ({ ...f, lat: String(clamped) }));
      } else {
        const clamped = Math.max(88.0, Math.min(92.7, n));
        return setForm(f => ({ ...f, lng: String(clamped) }));
      }
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
    if (!file) { setNewVideo(null); return; }
    if (!file.type?.startsWith('video/')) {
      alert('Please select a valid video file.');
      e.target.value = '';
      return;
    }
    const VIDEO_MAX = 50 * 1024 * 1024; // 50 MB
    if (file.size > VIDEO_MAX) {
      alert('Video is larger than 50 MB. Please choose a smaller file.');
      e.target.value = '';
      return;
    }
    setNewVideo(file);
    setRemoveVideo(false); // replacing existing video
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // Client-side validations to match server
    const errs = [];
    const totalPhotos = existingPhotos.filter((u) => keepPhoto[u]).length + newPhotos.length;
    if (!form.title || !form.title.trim()) errs.push('Title');
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum)) errs.push('Price');
    if (!form.type) errs.push('Listing Type');
    if (!form.availableFrom) errs.push('Available From');
    const roomsNum = Number(form.rooms);
    if (!Number.isFinite(roomsNum) || roomsNum < 0) errs.push('Rooms');
    const floorNum = Number(form.floor);
    if (!Number.isFinite(floorNum) || floorNum < 0) errs.push('Floor');
    if (!form.division) errs.push('Division');
    if (!form.district) errs.push('District');
    if (!form.subdistrict) errs.push('Subdistrict');
    if (!form.area) errs.push('Area');
    if (!form.phone || !form.phone.trim()) errs.push('Phone');
    if (totalPhotos < 1) errs.push('At least 1 Photo');
    if (errs.length) {
      alert(`Please fill required fields:\n- ${errs.join('\n- ')}`);
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
  sizeSqft: String(Number(form.sizeSqft || 0)),
        contactName: form.contactName || '',
  phone: form.phone || '',
  lat: form.lat || '',
  lng: form.lng || '',
      };
      Object.entries(baseFields).forEach(([k, v]) => fd.append(k, v));

      // Existing photos to keep
      const keepUrls = existingPhotos.filter((u) => keepPhoto[u]);
      fd.append('existingPhotoUrls', JSON.stringify(keepUrls));
      // New photos (filter obviously large files ~10MB per file to avoid network aborts)
      const PHOTO_MAX = 10 * 1024 * 1024;
      newPhotos.forEach((file) => {
        if (file.size > PHOTO_MAX) return; // silently skip too-large files
        fd.append('photos', file);
      });
      // Optional new video (replace old)
  if (newVideo) {
        const VIDEO_MAX = 50 * 1024 * 1024;
        if (newVideo.size > VIDEO_MAX) {
          throw new Error('Selected video exceeds 50 MB.');
        }
        fd.append('video', newVideo);
      }
  // Remove existing video if requested
  fd.append('removeVideo', String(!!removeVideo));
  // If editing and keeping the existing video (not replacing or removing), send it explicitly
  if (id && videoUrl && !removeVideo && !newVideo) {
    fd.append('existingVideoUrl', videoUrl);
  }

      const headers = { 
        ...(localStorage.getItem('authToken') ? {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        } : {})
      };
      if (id) await axios.put(`/api/listings/${id}`, fd, { headers });
      else await axios.post('/api/listings', fd, { headers });
  navigate('/map');
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const fields = Array.isArray(data?.fields) ? `\nFields: ${data.fields.join(', ')}` : '';
      let msg = data?.error || e?.message || 'Save failed';
      if (msg && msg.toLowerCase().includes('network')) {
        msg = 'Network error: Upload may be too large or server unreachable. Try smaller files or check the server.';
      }
      alert(`${msg}${fields}`);
      // Helpful for debugging in dev
      // eslint-disable-next-line no-console
      console.error('Save error:', { status, data, error: e });
    } finally {
      setLoading(false);
    }
  };

  const isEdit = Boolean(id);
  return (
  <Paper sx={{ maxWidth: 1400, mx: 'auto', my: 1.5, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>{isEdit ? 'Edit Listing' : 'Add Listing'}</Typography>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab label="Basic" />
        <Tab label="Address" />
        <Tab label="Media" />
        <Tab label="Pricing" />
        <Tab label="Details" />
        <Tab label="Contact" />
      </Tabs>
      <Box component="form" onSubmit={onSubmit}>
        {tab === 0 && (
          <>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label={<>Title<span className="req-star">*</span></>} name="title" value={form.title} onChange={onChange} fullWidth required />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required>
              <InputLabel>Listing Type</InputLabel>
              <Select label="Listing Type" name="type" value={form.type} onChange={onChange}>
                <MenuItem value="Apartment">Apartment</MenuItem>
                <MenuItem value="Room">Room</MenuItem>
                <MenuItem value="Sublet">Sublet</MenuItem>
                <MenuItem value="Commercial">Commercial</MenuItem>
                <MenuItem value="Hostel">Hostel</MenuItem>
              </Select>
            </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6 }}>
            <TextField type="date" label={<>Available From<span className="req-star">*</span></>} name="availableFrom" value={form.availableFrom} onChange={onChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
            <TextField type="number" label={<>Rooms<span className="req-star">*</span></>} name="rooms" inputProps={{ min: 0, step: 1 }} value={form.rooms} onChange={onChange} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
            <TextField type="number" label="Bathrooms" name="bathrooms" value={form.bathrooms} onChange={onChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
            <TextField type="number" label="Balcony" name="balcony" value={form.balcony} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
            <TextField type="number" label="Person Count" name="personCount" value={form.personCount} onChange={onChange} fullWidth />
            </Grid>
            <Grid size={12}>
              <TextField label="Features (comma separated)" name="features" value={form.features} onChange={onChange} fullWidth />
            </Grid>
          </Grid>
          <Box sx={{ mt: 1.5 }}>
            <TextField label="Description" name="description" value={form.description} onChange={onChange} fullWidth multiline minRows={10} placeholder="Add more details about the property..." />
          </Box>
          </>
        )}

        {tab === 1 && (
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel shrink>Division</InputLabel>
                <Select
                  label="Division"
                  name="division"
                  value={form.division || ''}
                  onChange={onChange}
                  size="medium"
                  displayEmpty
                  renderValue={(val) => val ? val : <Typography color="text.disabled">Select division</Typography>}
                >
                  <MenuItem value=""><em>Select division</em></MenuItem>
                  {getDivisions().map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.division}>
                <InputLabel shrink>District</InputLabel>
                <Select
                  label="District"
                  name="district"
                  value={form.district || ''}
                  onChange={onChange}
                  size="medium"
                  displayEmpty
                  renderValue={(val) => val ? val : <Typography color="text.disabled">Select district</Typography>}
                >
                  <MenuItem value=""><em>Select district</em></MenuItem>
                  {getDistricts(form.division).map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.district}>
                <InputLabel shrink>Subdistrict</InputLabel>
                <Select
                  label="Subdistrict"
                  name="subdistrict"
                  value={form.subdistrict || ''}
                  onChange={onChange}
                  size="medium"
                  displayEmpty
                  renderValue={(val) => val ? val : <Typography color="text.disabled">Select subdistrict</Typography>}
                >
                  <MenuItem value=""><em>Select subdistrict</em></MenuItem>
                  {getUpazilas(form.division, form.district).map((u) => (
                    <MenuItem key={u} value={u}>{u}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={<>Area<span className="req-star">*</span></>} name="area" value={form.area || ''} onChange={onChange} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Road" name="road" value={form.road || ''} onChange={onChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="House No" name="houseNo" value={form.houseNo || ''} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField type="number" label="Latitude (Bangladesh)" name="lat" inputProps={{ step: 'any', min: 20.5, max: 26.7 }} value={form.lat} onChange={onChange} fullWidth helperText="Optional, for map marker" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField type="number" label="Longitude (Bangladesh)" name="lng" inputProps={{ step: 'any', min: 88.0, max: 92.7 }} value={form.lng} onChange={onChange} fullWidth helperText="Optional, for map marker" />
            </Grid>
            <Grid size={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button variant="outlined" size="small" onClick={() => setShowPicker(s => !s)}>
                  {showPicker ? 'Hide map picker' : 'Pick on map'}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  You can type coordinates or click "Pick on map" and drop a marker.
                </Typography>
              </div>
            </Grid>
            {showPicker && (
              <Grid size={12}>
                <MapPicker
                  lat={form.lat === '' ? undefined : Number(form.lat)}
                  lng={form.lng === '' ? undefined : Number(form.lng)}
                  onChange={({ lat, lng }) => setForm(f => ({ ...f, lat: lat === '' ? '' : String(lat), lng: lng === '' ? '' : String(lng) }))}
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField type="number" label="Latitude (Bangladesh)" name="lat" inputProps={{ step: 'any', min: 20.5, max: 26.7 }} value={form.lat} onChange={onChange} fullWidth helperText="Optional, for map marker" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField type="number" label="Longitude (Bangladesh)" name="lng" inputProps={{ step: 'any', min: 88.0, max: 92.7 }} value={form.lng} onChange={onChange} fullWidth helperText="Optional, for map marker" />
            </Grid>
          </Grid>
        )}

        {tab === 2 && (
          <Grid container spacing={1.5}>
            <Grid size={12}>
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
            </Grid>

            <Grid item xs={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>Video</b>
                <label className="dropzone">
                  <input type="file" accept="video/*" onChange={onPickVideo} hidden />
                  Click to select a video (optional, max 50 MB)
                </label>
              </div>
              {newVideo ? (
                <div>
                  <video src={newVideoPreview} controls style={{ width: '100%', maxHeight: 240 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{newVideo.name}</p>
                    <button type="button" className="btn ghost" onClick={() => setNewVideo(null)}>Remove</button>
                  </div>
                </div>
              ) : videoUrl && !removeVideo ? (
                <div>
                  <video src={videoUrl} controls style={{ width: '100%', maxHeight: 240 }} />
                  <div style={{ marginTop: 6 }}>
                    <button type="button" className="btn danger" onClick={() => setRemoveVideo(true)}>Remove video</button>
                  </div>
                </div>
              ) : removeVideo ? (
                <div className="badge" style={{ width: 'fit-content' }}>
                  Video will be removed on save
                  <button type="button" className="icon-btn" style={{ marginLeft: 8 }} onClick={() => setRemoveVideo(false)}>Undo</button>
                </div>
              ) : null}
            </Grid>
            {isEdit && (
              <Grid item xs={12}>
                <FormControlLabel control={<Checkbox name="isRented" checked={form.isRented} onChange={onChange} />} label="Mark as rented" />
              </Grid>
            )}
          </Grid>
        )}

        {tab === 3 && (
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField type="number" label={<>Rent Price<span className="req-star">*</span></>} name="price" inputProps={{ min: 0, step: 1 }} value={form.price} onChange={onChange} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField type="number" label="Security deposit" name="deposit" inputProps={{ min: 0, step: 1 }} value={form.deposit || ''} onChange={onChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField type="number" label="Service charge" name="serviceCharge" inputProps={{ min: 0, step: 1 }} value={form.serviceCharge || ''} onChange={onChange} fullWidth />
            </Grid>
            <Grid size={12}>
              <FormControlLabel control={<Checkbox name="negotiable" checked={!!form.negotiable} onChange={onChange} />} label="Negotiable" />
            </Grid>
          </Grid>
        )}

        {tab === 4 && (
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField type="number" label={<>Floor<span className="req-star">*</span></>} name="floor" inputProps={{ min: 0, step: 1 }} value={form.floor || ''} onChange={onChange} required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField type="number" label="Total floors" name="totalFloors" inputProps={{ min: 0, step: 1 }} value={form.totalFloors || ''} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField type="number" label="Size (sq ft)" name="sizeSqft" inputProps={{ min: 0, step: 1 }} value={form.sizeSqft || ''} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Furnishing</InputLabel>
                <Select label="Furnishing" name="furnishing" value={form.furnishing || 'Unfurnished'} onChange={onChange}>
                  <MenuItem value="Unfurnished">Unfurnished</MenuItem>
                  <MenuItem value="Semi-furnished">Semi-furnished</MenuItem>
                  <MenuItem value="Furnished">Furnished</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Utilities included (comma separated)" name="utilitiesIncluded" value={form.utilitiesIncluded || ''} onChange={onChange} placeholder="e.g., water, gas, internet" fullWidth />
            </Grid>
          </Grid>
        )}

        {tab === 5 && (
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField label="Contact name" name="contactName" value={form.contactName || ''} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label={<>Phone<span className="req-star">*</span></>} name="phone" value={form.phone || ''} onChange={onChange} placeholder="01XXXXXXXXX" required fullWidth />
            </Grid>
          </Grid>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          <Button variant="outlined" type="button" onClick={() => navigate('/')}>Cancel</Button>
        </Stack>
      </Box>
    </Paper>
  );
}
