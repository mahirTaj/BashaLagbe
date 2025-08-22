import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { Box, Button, Chip, CircularProgress, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography, Card, CardContent, CardMedia, CardActions, Paper, TextField, InputAdornment, IconButton } from '@mui/material';
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
  }, [user.id]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/listings', {
        headers: { 'x-user-id': user.id },
      });
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
      await axios.delete(`/api/listings/${id}`, { headers: { 'x-user-id': user.id } });
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
        <Button component={Link} to="/add" variant="contained">Add Listing</Button>
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
  <Grid container spacing={1.5}>
          {filtered.map((l) => (
            <Grid item xs={12} sm={6} md={4} key={l._id}>
              <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {l.photoUrls?.[0] ? (
                  <CardMedia component="img" height="140" image={l.photoUrls[0]} alt="thumb" />
                ) : (
                  <Box sx={{ height: 140, display: 'grid', placeItems: 'center', bgcolor: 'grey.100', color: 'text.secondary' }}>No Photo</Box>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{l.title}</Typography>
                    {l.isRented && <Chip size="small" color="success" label="Rented" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {[l.houseNo, l.road, l.area, l.subdistrict, l.district, l.division].filter(Boolean).join(', ') || l.location}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 700 }}>৳{l.price} • {l.type}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => navigate(`/edit/${l._id}`)}>Edit</Button>
                    <Button color="error" variant="contained" onClick={() => handleDelete(l._id)}>Delete</Button>
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
