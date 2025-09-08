import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';

// Simple compare modal: pick another listing (search) and show row-wise comparison
export default function CompareModal({ open, onClose, baseListing }) {
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  // results will include an `isSuggestion` flag to distinguish suggestion chips
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [other, setOther] = useState(null);
  const [loadingOther, setLoadingOther] = useState(false);
  const [otherIdInput, setOtherIdInput] = useState('');

  useEffect(() => {
    if (!open) {
      setQ(''); setResults([]); setSelectedId(null); setOther(null); setOtherIdInput('');
    }
  }, [open]);

  useEffect(() => {
    // Suggestion/search debounce
    const activeBaseId = baseListing?._id;
    function normalizePrice(p) {
      if (p == null) return null;
      if (typeof p === 'number') return p;
      if (typeof p === 'string') {
        const cleaned = p.replace(/[^0-9.]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    }

    const t = setTimeout(async () => {
      if (!q) {
        // use baseListing context when available
        const basePrice = normalizePrice(baseListing?.price);
        const area = baseListing?.area || baseListing?.district || baseListing?.road || null;
        if (!baseListing || !basePrice || !area) {
          // no context -> clear results 
          setResults([]);
          return;
        }

        setSearching(false);
        try {
          const PRICE_RANGE = 0.20; // +/- 20%
          const priceMin = Math.max(0, Math.floor(basePrice * (1 - PRICE_RANGE)));
          const priceMax = Math.ceil(basePrice * (1 + PRICE_RANGE));

          // Preferred: backend supports area+price filtering
          const params = { area, priceMin, priceMax, limit: 12 };
          let res = null;
          try { res = await axios.get('/api/listings/search', { params }); } catch (e) { res = null; }

          let data = res?.data?.data ?? res?.data ?? [];

          // Fallback: if backend didn't filter by price, fetch by area and filter client side
          if (!data || data.length === 0) {
            try {
              const r2 = await axios.get('/api/listings/search', { params: { q: area, limit: 50 } });
              const byArea = r2?.data?.data ?? r2?.data ?? [];
              data = byArea.filter(item => {
                const ip = normalizePrice(item?.price);
                return ip != null && ip >= priceMin && ip <= priceMax;
              }).slice(0, 12);
            } catch (e) { data = []; }
          }
          

          // mark as suggestions and exclude base listing
          const filtered = (data || []).filter(i => String(i._id) !== String(activeBaseId)).map(i => ({ ...i, isSuggestion: true }));
          setResults(filtered);
        } catch (e) {
          setResults([]);
        } finally {
          setSearching(false);
        }
      } else {
        // typed search
        setSearching(true);
        try {
          const res = await axios.get('/api/listings/search', { params: { q, limit: 12 } });
          const data = res?.data?.data ?? res?.data ?? [];
          const filtered = (data || []).filter(i => String(i._id) !== String(activeBaseId)).map(i => ({ ...i, isSuggestion: false }));
          setResults(filtered);
        } catch (e) {
          setResults([]);
        } finally {
          setSearching(false);
        }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function loadOther(id) {
    if (!id) return;
    setLoadingOther(true);
    try {
      const res = await axios.get(`/api/listings/${id}`);
      const listing = res?.data?.data ?? res?.data ?? null;
      setOther(listing);
      setSelectedId(id);
    } catch (e) {
      setOther(null);
      setSelectedId(null);
      alert('Failed to load listing for id: ' + id);
    } finally { setLoadingOther(false); }
  }

  // convenience: when clicking a chip from search
  useEffect(() => {
    if (selectedId) loadOther(selectedId);
  }, [selectedId]);

  function renderRow(label, a, b) {
    const aVal = Array.isArray(a) ? (a.length ? a.join(', ') : '—') : (a || '—');
    const bVal = Array.isArray(b) ? (b.length ? b.join(', ') : '—') : (b || '—');
    return (
      <TableRow key={label} sx={{ borderBottom: '1px dashed' }}>
        <TableCell sx={{ width: '35%', verticalAlign: 'top' }}><Typography variant="caption" color="text.secondary">{label}</Typography></TableCell>
        <TableCell sx={{ width: '32%', verticalAlign: 'top' }}><Typography sx={{ fontWeight: 600 }}>{aVal}</Typography></TableCell>
        <TableCell sx={{ width: '33%', verticalAlign: 'top' }}><Typography sx={{ fontWeight: 600 }}>{loadingOther ? 'Loading...' : bVal}</Typography></TableCell>
      </TableRow>
    );
  }



  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Compare listings</DialogTitle>
      <DialogContent dividers>
        {/* Header: side-by-side profile pics and titles */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 140, textAlign: 'center' }}>
              <Box sx={{ width: 120, height: 90, bgcolor: 'grey.100', borderRadius: 1, overflow: 'hidden', mx: 'auto' }}>
                <img src={baseListing.photoUrls?.[0] || ''} alt="base" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </Box>
              <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>{baseListing.title}</Typography>
              <Typography variant="caption" color="text.secondary">ID: {baseListing._id}</Typography>
            </Box>

            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="h6">VS</Typography>
            </Box>

            <Box sx={{ width: 140, textAlign: 'center' }}>
              <Box sx={{ width: 120, height: 90, bgcolor: 'grey.100', borderRadius: 1, overflow: 'hidden', mx: 'auto' }}>
                <img src={other?.photoUrls?.[0] || ''} alt="other" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </Box>
              <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>{other?.title || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">ID: {other?._id || '—'}</Typography>
            </Box>
          </Box>

          <Box sx={{ width: 320 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField fullWidth placeholder="Enter other listing ID" value={otherIdInput} onChange={e => setOtherIdInput(e.target.value)} />
              <Button variant="contained" onClick={() => loadOther(otherIdInput)} disabled={!otherIdInput || loadingOther}>Load</Button>
            </Box>
            <TextField fullWidth placeholder="Or search by area, title or id" value={q} onChange={e => setQ(e.target.value)} InputProps={{ endAdornment: searching ? <CircularProgress size={18} /> : null }} />
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              {results.map(r => (
                <Chip
                  key={r._id}
                  label={`${r.title || r._id}${r.price ? ` — ৳${(typeof r.price === 'number' ? r.price.toLocaleString() : r.price)}` : ''}`}
                  clickable
                  color={selectedId === r._id ? 'primary' : (r.isSuggestion ? 'success' : 'default')}
                  variant={r.isSuggestion ? 'filled' : 'outlined'}
                  onClick={() => setSelectedId(r._id)}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* Comparison table grouped into sections */}
        <Box sx={{ display: 'grid', gap: 2 }}>
          {/* Basic Info */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Basic Information</Typography>
            <Table size="small" sx={{ bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell><Typography variant="caption" color="text.secondary">Field</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">This listing</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">Other listing</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {renderRow('Title', baseListing.title, other?.title)}
                {renderRow('Price (৳)', baseListing.price ? baseListing.price.toLocaleString() : null, other?.price ? other.price.toLocaleString() : null)}
                {renderRow('Size (sq ft)', baseListing.sizeSqft, other?.sizeSqft)}
                {renderRow('Rooms', baseListing.rooms, other?.rooms)}
                {renderRow('Bathrooms', baseListing.bathrooms, other?.bathrooms)}
                {renderRow('Furnishing', baseListing.furnishing, other?.furnishing)}
                {renderRow('Address', [baseListing.houseNo, baseListing.road, baseListing.area, baseListing.district].filter(Boolean).join(', '), other ? [other.houseNo, other.road, other.area, other.district].filter(Boolean).join(', ') : null)}
              </TableBody>
            </Table>
          </Box>

          {/* Features & Utilities */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Features & Utilities</Typography>
            <Table size="small" sx={{ bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell><Typography variant="caption" color="text.secondary">Field</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">This listing</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">Other listing</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {renderRow('Features', baseListing.features || [], other?.features || [])}
                {renderRow('Utilities Included', baseListing.utilitiesIncluded || [], other?.utilitiesIncluded || [])}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => { if (selectedId) loadOther(selectedId); }}>Load Selected</Button>
      </DialogActions>
    </Dialog>
  );
}

CompareModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  baseListing: PropTypes.object.isRequired,
};
