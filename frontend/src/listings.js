import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { Box, Button, Chip, CircularProgress, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography, Card, CardContent, CardMedia, CardActions, Paper, TextField, InputAdornment, IconButton, Alert } from '@mui/material';
import { Button as UiButton } from './components/ui/button';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

export default function Listings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusSeg, setStatusSeg] = useState('all'); // all | available | rented
  const [typeSeg, setTypeSeg] = useState('all'); // all | Apartment | Room | Sublet | Commercial | Hostel
  const [q, setQ] = useState(''); // search query

  useEffect(() => {
    if (user) {
      fetchListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchListings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/listings', {
        headers: {
          ...(localStorage.getItem('authToken') ? {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          } : {})
        }
      });
      setListings(res.data);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || 'Error fetching listings';
      if (status === 401) {
        // Don't automatically logout on 401; let user manually refresh or login
        setError('Unable to fetch listings. Please refresh the page or log in again.');
      } else {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await axios.delete(`/api/listings/${id}`, {
        headers: {
          ...(localStorage.getItem('authToken') ? {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          } : {})
        }
      });
      setListings((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Please log in to view your listings</Typography>
        <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
          Login
        </Button>
      </Box>
    );
  }

  const filtered = listings.filter((l) => {
    const statusOk = statusSeg === 'all' || (statusSeg === 'rented' ? !!l.isRented : !l.isRented);
    const typeOk = typeSeg === 'all' || l.type === typeSeg;
    const query = q.trim().toLowerCase();
    const address = [l.houseNo, l.road, l.area, l.subdistrict, l.district, l.division].filter(Boolean).join(', ');
    const text = `${l.title || ''} ${address || ''} ${l.description || ''}`.toLowerCase();
    const textOk = query === '' || text.includes(query);
    return statusOk && typeOk && textOk;
  });

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>My Listings</Typography>
        <UiButton asChild>
          <Link to="/add">Add Listing</Link>
        </UiButton>
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 4,
          bgcolor: 'grey.100',
          borderColor: 'grey.300',
          borderRadius: 2,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 1 }}>
            <FilterListIcon color="action" fontSize="small" />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Filters
            </Typography>
          </Stack>
          <ToggleButtonGroup
            value={statusSeg}
            exclusive
            onChange={(e, v) => v && setStatusSeg(v)}
            size="small"
            color="primary"
            sx={{ '& .MuiToggleButton-root': { fontSize: 12, fontWeight: 700, px: 1.2 } }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="available">Available</ToggleButton>
            <ToggleButton value="rented">Rented</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            value={typeSeg}
            exclusive
            onChange={(e, v) => v && setTypeSeg(v)}
            size="small"
            color="primary"
            sx={{ '& .MuiToggleButton-root': { fontSize: 12, fontWeight: 700, px: 1.2 } }}
          >
            <ToggleButton value="all">All types</ToggleButton>
            <ToggleButton value="Apartment">Apartment</ToggleButton>
            <ToggleButton value="Room">Room</ToggleButton>
            <ToggleButton value="Sublet">Sublet</ToggleButton>
            <ToggleButton value="Commercial">Commercial</ToggleButton>
            <ToggleButton value="Hostel">Hostel</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ ml: { xs: 0, sm: 'auto' }, mt: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 260 }, maxWidth: 360 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search listings"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: q ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setQ('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>
        </Stack>
      </Paper>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : listings.length === 0 ? (
        <Card sx={{ p: 2, textAlign: 'center' }}>
          <Typography>You have no listings yet.</Typography>
        </Card>
      ) : (
  <Grid container spacing={2.5}>
          {filtered.map((l) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={l._id}>
              <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 380 }}>
                <Box sx={{ height: 200, position: 'relative', bgcolor: 'grey.100', overflow: 'hidden' }}>
                  {l.photoUrls?.[0] ? (
                    <img
                      src={l.photoUrls[0]}
                      alt="thumb"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>No Photo</Box>
                  )}
                  {l.isRented && <Chip size="small" color="success" label="Rented" sx={{ position: 'absolute', top: 8, left: 8 }} />}
                </Box>
                <CardContent sx={{ flexGrow: 1, display: 'grid', alignContent: 'start', gap: 0.5 }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Button
                      onClick={() => navigate(`/listing/${l._id}`)}
                      variant="text"
                      size="small"
                      sx={{ 
                        fontWeight: 800,
                        textTransform: 'none',
                        px: 0,
                        minWidth: 0,
                        lineHeight: 1.2,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left',
                        color: 'text.primary',
                        position: 'relative',
                        '&:hover': { color: 'text.primary' },
                        '&::after': {
                          content: '""', position: 'absolute', left: 0, right: '76%', bottom: -2, height: 2,
                          background: 'linear-gradient(90deg,#facc15,#fde68a)', borderRadius: 2, transform: 'scaleX(0)', transformOrigin: 'left', transition: 'transform .25s ease'
                        },
                        '&:hover::after': { transform: 'scaleX(1)' }
                      }}
                    >
                      {l.title}
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {[l.houseNo, l.road, l.area, l.subdistrict, l.district, l.division].filter(Boolean).join(', ') || l.location}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>৳{l.price}</Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', pt: 0.5 }}>
                  <Chip label={l.type} size="small" color="primary" />
                  <Stack direction="row" spacing={1}>
                    <UiButton variant="outline" onClick={() => navigate(`/edit/${l._id}`)}>Edit</UiButton>
                    <UiButton variant="destructive" onClick={() => handleDelete(l._id)}>Delete</UiButton>
                  </Stack>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
