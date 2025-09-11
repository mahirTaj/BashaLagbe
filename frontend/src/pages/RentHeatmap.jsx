import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { BD_DISTRICTS_GEOJSON } from '../data/bd-districts-geojson';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import {
  Map as MapIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
  TrendingUp as TrendingIcon,
  LegendToggle as LegendIcon,
} from '@mui/icons-material';

const BD_CENTER = { lat: 23.8103, lng: 90.4125 };
const BD_BOUNDS = [
  [20.5, 88.0],
  [26.7, 92.7]
];

function getColor(value, min, max) {
  if (!Number.isFinite(value)) return '#9CA3AF';
  const t = Math.max(0, Math.min(1, (value - min) / Math.max(1e-6, max - min)));
  // Professional color scheme: blue to red gradient
  const r = Math.round(59 + (201 - 59) * t);
  const g = Math.round(130 + (30 - 130) * t);
  const b = Math.round(246 + (30 - 246) * t);
  return `rgb(${r},${g},${b})`;
}

export default function RentHeatmap() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [period, setPeriod] = useState('month');
  const [propertyType, setPropertyType] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHeatmapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, propertyType, minBudget, maxBudget]);

  async function fetchHeatmapData() {
    setLoading(true);
    setError('');
    setDistricts([]);
    try {
      const params = { period };
      if (propertyType) params.propertyType = propertyType;
      if (minBudget) params.minBudget = minBudget;
      if (maxBudget) params.maxBudget = maxBudget;
      const res = await axios.get('/api/listings/trends/heatmap', { params });
      if (!res.data || !res.data.data) {
        setError('No aggregated heatmap data returned');
        setLoading(false);
        return;
      }

      const list = Array.isArray(res.data.data) ? res.data.data : [];
      setDistricts(list.map((r) => ({ district: r.district, avgRent: r.avgRent, count: r.count })));

      if (list.length === 0) {
        setError('No district data available.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to fetch heatmap data');
    } finally {
      setLoading(false);
    }
  }

  const minRent = useMemo(() => districts.reduce((m, d) => Math.min(m, d.avgRent || Infinity), Infinity) || 0, [districts]);
  const maxRent = useMemo(() => districts.reduce((m, d) => Math.max(m, d.avgRent || -Infinity), -Infinity) || 0, [districts]);

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <MapIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Rent Price Heatmap
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Period</InputLabel>
              <Select
                value={period}
                label="Period"
                onChange={(e) => setPeriod(e.target.value)}
              >
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="year">Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Property Type</InputLabel>
              <Select
                value={propertyType}
                label="Property Type"
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="Apartment">Apartment</MenuItem>
                <MenuItem value="Room">Room</MenuItem>
                <MenuItem value="Sublet">Sublet</MenuItem>
                <MenuItem value="Commercial">Commercial</MenuItem>
                <MenuItem value="Hostel">Hostel</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Min Budget"
              type="number"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              placeholder="0"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Max Budget"
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="No limit"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={fetchHeatmapData}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              sx={{ height: 40 }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {districts.length} districts mapped
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Data aggregated from all sources
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <LinearProgress sx={{ mb: 3 }} />
      )}

      <Paper elevation={2} sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ position: 'relative' }}>
          <MapContainer
            center={BD_CENTER}
            zoom={7}
            style={{
              height: isMobile ? '50vh' : '70vh',
              width: '100%'
            }}
            maxBounds={BD_BOUNDS}
            maxBoundsViscosity={1.0}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              data={BD_DISTRICTS_GEOJSON}
              style={(feature) => {
                const district = districts.find(d =>
                  d.district.toLowerCase() === feature.properties.name.toLowerCase()
                );
                const rent = district ? district.avgRent : 0;
                return {
                  fillColor: getColor(rent, minRent, maxRent),
                  weight: 2,
                  opacity: 1,
                  color: 'white',
                  dashArray: '3',
                  fillOpacity: 0.7
                };
              }}
              onEachFeature={(feature, layer) => {
                const district = districts.find(d =>
                  d.district.toLowerCase() === feature.properties.name.toLowerCase()
                );
                if (district) {
                  layer.bindPopup(`
                    <div style="font-family: Roboto, sans-serif; padding: 8px;">
                      <strong style="font-size: 16px; color: #1976d2;">
                        ${district.district}
                      </strong><br>
                      <span style="color: #666;">Average Rent: </span>
                      <strong style="color: #2e7d32;">৳${district.avgRent.toLocaleString()}</strong><br>
                      <span style="color: #666;">Total Listings: </span>
                      <strong>${district.count}</strong><br>
                      <span style="color: #666;">Period: </span>
                      <strong>${period}</strong>
                    </div>
                  `);
                }
              }}
            />
          </MapContainer>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <LegendIcon sx={{ mr: 1 }} />
          Legend
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 16,
                backgroundColor: getColor(minRent, minRent, maxRent),
                borderRadius: 1
              }}
            />
            <Typography variant="body2">
              Low: ৳{minRent.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 16,
                backgroundColor: getColor((minRent + maxRent) / 2, minRent, maxRent),
                borderRadius: 1
              }}
            />
            <Typography variant="body2">
              Medium: ৳{((minRent + maxRent) / 2).toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 16,
                backgroundColor: getColor(maxRent, minRent, maxRent),
                borderRadius: 1
              }}
            />
            <Typography variant="body2">
              High: ৳{maxRent.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
