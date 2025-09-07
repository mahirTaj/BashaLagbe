import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  TextField,
  Paper,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#d32f2f', '#0097a7', '#5d4037', '#455a64'];

export default function CompareAreas() {
  const [areas, setAreas] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [popularAreas, setPopularAreas] = useState([]);
  const [popularDistricts, setPopularDistricts] = useState([]);

  const [selectedAreas, setSelectedAreas] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [period, setPeriod] = useState('month'); // 'month' | 'year'
  const [source, setSource] = useState('combined'); // 'scraped' | 'listings' | 'combined'
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'
  const [propertyType, setPropertyType] = useState('');
  const [rooms, setRooms] = useState(''); // exact rooms
  const [sqftMin, setSqftMin] = useState('');
  const [sqftMax, setSqftMax] = useState('');

  const [rows, setRows] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch options
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError('');
        let res;
        try {
          res = await axios.get('/api/listings/trends/areas');
        } catch (e1) {
          // Fallback to alternate trends router
          res = await axios.get('/api/trends/filters');
          const fromAlt = res.data || {};
          // normalize shape to {areas, districts, popularAreas, popularDistricts}
          res = { data: {
            areas: fromAlt.areas || [],
            districts: fromAlt.districts || [],
            popularAreas: fromAlt.areas || [],
            popularDistricts: fromAlt.districts || []
          } };
        }
        if (!mounted) return;
        const { areas = [], districts = [], popularAreas = [], popularDistricts = [] } = res.data || {};
        setAreas(areas);
        setDistricts(districts);
        setPopularAreas(popularAreas);
        setPopularDistricts(popularDistricts);
        // default selections
        const defaults = (popularAreas && popularAreas.length ? popularAreas : areas).slice(0, 5);
        setSelectedAreas(defaults);
      } catch (e) {
        if (!mounted) return;
        setError('Failed to load filter options');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Transform grouped data { loc: [{period, avgRent}], ... } => rows
  const buildRows = useMemo(() => {
    return (grouped) => {
      const periods = new Set();
      Object.values(grouped || {}).forEach(arr => arr.forEach(pt => periods.add(pt.period)));
      const sorted = Array.from(periods).sort();
      // Filter out series (locations) that have no data across all periods
      const locsAll = Object.keys(grouped || {});
      const locs = locsAll.filter((loc) => (grouped[loc] || []).some(pt => Number.isFinite(pt.avgRent) && pt.avgRent > 0));
      const out = sorted.map(p => {
        const r = { period: p };
        locs.forEach(loc => {
          const found = (grouped[loc] || []).find(x => x.period === p);
          r[loc] = found ? found.avgRent : null;
        });
        return r;
      });
      return { rows: out, series: locs };
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const build = async (opts) => {
      const p = new URLSearchParams();
      if (opts.areas?.length) p.append('areas', opts.areas.join(','));
      if (opts.districts?.length) p.append('districts', opts.districts.join(','));
      p.append('period', opts.period || period);
      p.append('source', source);
      if (propertyType) p.append('propertyType', propertyType);
      if (rooms) p.append('rooms', String(rooms));
      if (sqftMin) p.append('sqftMin', String(sqftMin));
      if (sqftMax) p.append('sqftMax', String(sqftMax));
      try {
        const res = await axios.get(`/api/listings/trends/compare?${p}`);
        return res.data?.data || {};
      } catch (err) {
        // Try alternate router as a fallback
        try {
          const res2 = await axios.get(`/api/trends/compare?${p}`);
          return res2.data?.data || {};
        } catch (err2) {
          throw err2 || err;
        }
      }
    };

    try {
      // Strategy A: as selected
      let grouped = await build({ areas: selectedAreas, districts: selectedDistricts, period });
      let built = buildRows(grouped);
      if (built.rows.length > 0) {
        setRows(built.rows); setSeries(built.series); return;
      }
      // Strategy B: yearly
      grouped = await build({ areas: selectedAreas, districts: selectedDistricts, period: 'year' });
      built = buildRows(grouped);
      if (built.rows.length > 0) { setRows(built.rows); setSeries(built.series); return; }
      // Strategy C: popular districts if areas failed
      const fallbackDistricts = (popularDistricts?.length ? popularDistricts : districts).slice(0, 6);
      grouped = await build({ areas: [], districts: fallbackDistricts, period });
      built = buildRows(grouped);
      if (built.rows.length > 0) { setRows(built.rows); setSeries(built.series); return; }
      setRows([]); setSeries([]);
      setError('No data found for the selected criteria. Try popular areas/districts or Yearly view.');
    } catch (e) {
      console.error('Compare fetch error:', e);
      const msg = e?.response?.data?.error || e?.message || 'Failed to load comparison data';
      setError(msg);
      setRows([]); setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when defaults ready
  useEffect(() => {
    if (selectedAreas.length) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreas, period, source, propertyType, rooms, sqftMin, sqftMax]);

  const yDomain = useMemo(() => {
    const vals = [];
    rows.forEach(r => series.forEach(s => { const v = r[s]; if (Number.isFinite(v) && v > 0) vals.push(v); }));
    if (!vals.length) return [0, 100];
    const min = Math.min(...vals), max = Math.max(...vals), pad = Math.max(50, (max - min) * 0.1);
    return [Math.max(0, min - pad), max + pad];
  }, [rows, series]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Compare Areas</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <FormControl fullWidth>
            <InputLabel>Areas</InputLabel>
            <Select
              multiple
              value={selectedAreas}
              onChange={(e) => setSelectedAreas(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Areas" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((v) => (<Chip key={v} label={v} size="small" />))}
                </Box>
              )}
            >
              {(popularAreas.length ? popularAreas : areas).map(a => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Districts</InputLabel>
            <Select
              multiple
              value={selectedDistricts}
              onChange={(e) => setSelectedDistricts(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Districts" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((v) => (<Chip key={v} label={v} size="small" />))}
                </Box>
              )}
            >
              {(popularDistricts.length ? popularDistricts : districts).map(d => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Time Period</Typography>
            <ToggleButtonGroup value={period} exclusive onChange={(e, v) => v && setPeriod(v)}>
              <ToggleButton value="month">Monthly</ToggleButton>
              <ToggleButton value="year">Yearly</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Data Source</Typography>
            <ToggleButtonGroup value={source} exclusive onChange={(e, v) => v && setSource(v)}>
              <ToggleButton value="scraped">Scraped</ToggleButton>
              <ToggleButton value="listings">Listings</ToggleButton>
              <ToggleButton value="combined">Combined</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Listing type */}
          <FormControl fullWidth>
            <InputLabel>Listing Type</InputLabel>
            <Select
              value={propertyType}
              label="Listing Type"
              onChange={(e) => setPropertyType(e.target.value)}
            >
              <MenuItem value=""><em>Any</em></MenuItem>
              <MenuItem value="Apartment">Apartment</MenuItem>
              <MenuItem value="Family">Family</MenuItem>
              <MenuItem value="Bachelor">Bachelor</MenuItem>
              <MenuItem value="Sublet">Sublet</MenuItem>
              <MenuItem value="Commercial">Commercial</MenuItem>
              <MenuItem value="Hostel">Hostel</MenuItem>
            </Select>
          </FormControl>

          {/* Rooms (exact) */}
          <FormControl fullWidth>
            <InputLabel>Rooms</InputLabel>
            <Select
              value={rooms}
              label="Rooms"
              onChange={(e) => setRooms(e.target.value)}
            >
              <MenuItem value=""><em>Any</em></MenuItem>
              {[1,2,3,4,5,6].map(n => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Area (sqft) */}
          <TextField
            label="Min Sqft"
            type="number"
            value={sqftMin}
            onChange={(e) => setSqftMin(e.target.value.replace(/[^0-9]/g, ''))}
            fullWidth
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Max Sqft"
            type="number"
            value={sqftMax}
            onChange={(e) => setSqftMax(e.target.value.replace(/[^0-9]/g, ''))}
            fullWidth
            inputProps={{ min: 0 }}
          />

          <Box>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Chart</Typography>
            <ToggleButtonGroup value={chartType} exclusive onChange={(e, v) => v && setChartType(v)}>
              <ToggleButton value="line">Line</ToggleButton>
              <ToggleButton value="bar">Bar</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ alignSelf: 'end' }}>
            <Button variant="contained" onClick={fetchData}>Refresh</Button>
          </Box>
        </Box>
      </Paper>

      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {!loading && rows.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ width: '100%', height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={rows} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `৳${Number(v).toLocaleString()}`} domain={yDomain} />
                  <RechartsTooltip formatter={(v) => `৳${Number(v).toLocaleString()}`} />
                  <Legend />
                  {series.map((s, i) => (
                    <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={rows} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `৳${Number(v).toLocaleString()}`} domain={yDomain} />
                  <RechartsTooltip formatter={(v) => `৳${Number(v).toLocaleString()}`} />
                  <Legend />
                  {series.map((s, i) => (
                    <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={false} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
