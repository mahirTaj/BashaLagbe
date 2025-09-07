import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { Box, Button, Chip, CircularProgress, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography, Card, CardContent, CardMedia, CardActions, Paper, TextField, InputAdornment, IconButton } from '@mui/material';
import { Button as UiButton } from './components/ui/button';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

export default function Listings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusSeg, setStatusSeg] = useState('all'); // all | available | rented
  const [typeSeg, setTypeSeg] = useState('all'); // all | Apartment | Room | Sublet | Commercial | Hostel
  const [q, setQ] = useState(''); // search query

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchListings = async () => {
    setLoading(true);
    try {
        if (!user) {
          // If not logged in, redirect to login to encourage authentication for management
          navigate('/login');
          return;
        }
        const res = await axios.get('/api/listings');
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
      if (!user) return navigate('/login');
      await axios.delete(`/api/listings/${id}`);
      setListings((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

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
            <Grid item xs={12} sm={6} md={4} key={l._id}>
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
                      sx={{ fontWeight: 700, textTransform: 'none', px: 0, minWidth: 0, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left' }}
                    >
                      {l.title}
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {[l.houseNo, l.road, l.area, l.subdistrict, l.district, l.division].filter(Boolean).join(', ') || l.location}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>৳{l.price}</Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
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
