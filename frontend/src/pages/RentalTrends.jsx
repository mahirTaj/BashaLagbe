import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
  OutlinedInput,
  ListItemText,
  Checkbox
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import axios from 'axios';
import RefreshIcon from '@mui/icons-material/Refresh';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#d32f2f', '#0097a7', '#5d4037', '#455a64'];

const RentalTrends = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter options
  const [areas, setAreas] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [popularAreas, setPopularAreas] = useState([]);

  // User selections
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [period, setPeriod] = useState('month');
  const [source, setSource] = useState('combined');
  const [chartType, setChartType] = useState('line');
  const [propertyType, setPropertyType] = useState('');
  const [rooms, setRooms] = useState('');
  const [sqftMin, setSqftMin] = useState('');
  const [sqftMax, setSqftMax] = useState('');

  // Data and UI state
  const [chartData, setChartData] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available filter options (areas, districts)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await axios.get('/api/listings/trends/areas');
        const { areas = [], popularAreas = [] } = response.data || {};
        setAreas(areas);
        setPopularAreas(popularAreas);
        // Set default selections to ensure a chart loads initially
        if (popularAreas.length > 0) {
          setSelectedAreas(popularAreas.slice(0, 4));
        } else if (areas.length > 0) {
          setSelectedAreas(areas.slice(0, 4));
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
        setError('Failed to load location filters. The chart may not work.');
      }
    };
    fetchFilterOptions();
  }, []);

  // Main data fetching function
  const fetchCompareData = async () => {
    if (selectedAreas.length === 0) {
      setError('Please select at least one area to compare.');
      setChartData([]);
      setSeries([]);
      return;
    }

    setLoading(true);
    setError('');

    const params = new URLSearchParams({
      areas: selectedAreas.join(','),
      period,
      source,
    });

    // Append optional filters
    if (propertyType) params.append('propertyType', propertyType);
    if (rooms) {
      // exact rooms: map to min=max
      params.append('roomsMin', String(rooms));
      params.append('roomsMax', String(rooms));
    }
    if (sqftMin) params.append('sqftMin', String(sqftMin));
    if (sqftMax) params.append('sqftMax', String(sqftMax));

    const buildRows = (groupedData) => {
      const periods = new Set();
      Object.values(groupedData).forEach(arr => arr.forEach(pt => periods.add(pt.period)));
      const sortedPeriods = Array.from(periods).sort();
      const locations = Object.keys(groupedData);
      if (sortedPeriods.length === 0 || locations.length === 0) return { rows: [], locations: [] };
      const rows = sortedPeriods.map(p => {
        const row = { period: p };
        locations.forEach(loc => {
          const found = (groupedData[loc] || []).find(x => x.period === p);
          row[loc] = found ? found.avgRent : null;
        });
        return row;
      });
      // Drop periods where all values are null or <= 0
      const filtered = rows.filter(r => locations.some(loc => Number.isFinite(r[loc]) && r[loc] > 0));
      return { rows: filtered, locations };
    };

    try {
      // Attempt 1: as requested
      let response = await axios.get(`/api/listings/trends/compare?${params}`);
      let groupedData = response.data?.data || {};
      let built = buildRows(groupedData);
      if (built.rows.length === 0) {
        // Attempt 2: broaden to yearly
        const paramsYear = new URLSearchParams(params);
        paramsYear.set('period', 'year');
        response = await axios.get(`/api/listings/trends/compare?${paramsYear}`);
        groupedData = response.data?.data || {};
        built = buildRows(groupedData);
      }
      if (built.rows.length === 0) {
        setChartData([]);
        setSeries([]);
        setError('No comparison data found. Try Combined source, Yearly period, or different filters.');
        return;
      }

      setChartData(built.rows);
      setSeries(built.locations);

    } catch (err) {
      console.error('Error fetching comparison data:', err);
      const errorMsg = err.response?.data?.error || 'An unexpected error occurred while fetching data.';
      setError(errorMsg);
      setChartData([]);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch data when selections change
  useEffect(() => {
    if (selectedAreas.length > 0) {
      fetchCompareData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreas, period, source, propertyType, rooms, sqftMin, sqftMax]);

  // Calculate Y-axis domain for better chart scaling
  const yDomain = useMemo(() => {
    const allValues = [];
    chartData.forEach(row => {
      series.forEach(s => {
        const value = row[s];
        if (Number.isFinite(value) && value > 0) {
          allValues.push(value);
        }
      });
    });

    if (allValues.length === 0) return [0, 'auto'];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
    return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
  }, [chartData, series]);


  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        Compare Area Rent Trends
      </Typography>

      {/* --- Filter Controls --- */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Areas to Compare</InputLabel>
              <Select
                multiple
                value={selectedAreas}
                onChange={(e) => setSelectedAreas(e.target.value)}
                input={<OutlinedInput label="Areas to Compare" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => <Chip key={value} label={value} size="small" />)}
                  </Box>
                )}
              >
                {(popularAreas.length > 0 ? popularAreas : areas).map((area) => (
                  <MenuItem key={area} value={area}>
                    <Checkbox checked={selectedAreas.indexOf(area) > -1} />
                    <ListItemText primary={area} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <ToggleButtonGroup
              value={period}
              exclusive
              fullWidth
              onChange={(e, v) => v && setPeriod(v)}
            >
              <ToggleButton value="month">Monthly</ToggleButton>
              <ToggleButton value="year">Yearly</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <ToggleButtonGroup
              value={source}
              exclusive
              fullWidth
              onChange={(e, v) => v && setSource(v)}
            >
              <ToggleButton value="scraped">Scraped</ToggleButton>
              <ToggleButton value="listings">Listings</ToggleButton>
              <ToggleButton value="combined">Combined</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
             <ToggleButtonGroup
              value={chartType}
              exclusive
              fullWidth
              onChange={(e, v) => v && setChartType(v)}
            >
              <ToggleButton value="line">Line</ToggleButton>
              <ToggleButton value="bar">Bar</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          
          {/* Property Type filter */}
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Listing Type</InputLabel>
              <Select
                value={propertyType}
                label="Listing Type"
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <MenuItem value=""><em>Any</em></MenuItem>
                {/* Use concrete types that exist in data to avoid empty results */}
                <MenuItem value="Apartment">Apartment</MenuItem>
                <MenuItem value="Family">Family</MenuItem>
                <MenuItem value="Bachelor">Bachelor</MenuItem>
                <MenuItem value="Sublet">Sublet</MenuItem>
                <MenuItem value="Commercial">Commercial</MenuItem>
                <MenuItem value="Hostel">Hostel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Rooms (exact) */}
          <Grid size={{ xs: 6, md: 2 }}>
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
          </Grid>

          {/* Area (sqft) min/max */}
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              label="Min Sqft"
              type="number"
              value={sqftMin}
              onChange={(e) => setSqftMin(e.target.value.replace(/[^0-9]/g, ''))}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              label="Max Sqft"
              type="number"
              value={sqftMax}
              onChange={(e) => setSqftMax(e.target.value.replace(/[^0-9]/g, ''))}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Grid>

          {/* Manual refresh button */}
          <Grid size={{ xs: 6, md: 1 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={fetchCompareData}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              <RefreshIcon />
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* --- Chart Display --- */}
      <Paper sx={{ p: 2, height: isMobile ? 'auto' : '60vh', minHeight: '400px' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
          </Box>
        )}

        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={yDomain} tickFormatter={(val) => `৳${val.toLocaleString()}`} />
                <RechartsTooltip formatter={(val) => `৳${Number(val).toLocaleString()}`} />
                <Legend />
                {series.map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
                ))}
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={yDomain} tickFormatter={(val) => `৳${val.toLocaleString()}`} />
                <RechartsTooltip formatter={(val) => `৳${Number(val).toLocaleString()}`} />
                <Legend />
                {series.map((s, i) => (
                  <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </Paper>
    </Container>
  );
};

export default RentalTrends;
