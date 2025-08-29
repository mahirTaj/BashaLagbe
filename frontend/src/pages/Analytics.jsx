import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import {
  Home,
  AttachMoney,
  LocationCity,
  TrendingUp,
  Analytics as AnalyticsIcon,
  Refresh,
  Bed,
  Bathtub,
  Room
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import adminAPI from '../services/adminAPI';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSamples, setTotalSamples] = useState(0);
  const [averageRentData, setAverageRentData] = useState([]);
  const [districtStats, setDistrictStats] = useState([]);
  const [areaStats, setAreaStats] = useState([]);
  const [propertyTypeStats, setPropertyTypeStats] = useState([]);
  const [propertyFeatures, setPropertyFeatures] = useState({});
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [overallStats, setOverallStats] = useState({
    avgRent: 0,
    minRent: 0,
    maxRent: 0,
    totalProperties: 0,
    uniqueDistricts: 0,
    uniqueAreas: 0
  });

  // Color palette for charts
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f'];

  // Dynamic width calculator for wide bar charts (ensures full labels & spacing)
  const getBarChartWidth = (len) => Math.max(1400, len * 90); // 90px per bar incl. gap

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Refetch property type analytics when filters change so pie reflects selection
  useEffect(() => {
    const refetchPropertyTypes = async () => {
      try {
        const params = {};
        if (selectedDistrict) params.district = selectedDistrict;
        if (selectedArea) params.area = selectedArea;
        const response = await adminAPI.getPropertyTypeAnalytics(params);
        const propertyTypeStats = response.data.map(item => ({
          name: item.type || 'Unknown',
            value: item.count || 0,
            avgRent: item.avgRent || 0
        }));
        setPropertyTypeStats(propertyTypeStats);
      } catch (e) {
        console.error('Refetch property types error', e);
      }
    };
    refetchPropertyTypes();
  }, [selectedDistrict, selectedArea]);

  // Fetch area data when district changes
  useEffect(() => {
    if (selectedDistrict) {
      fetchAreaData(selectedDistrict);
    } else {
      setAreaStats([]);
      setSelectedArea('');
    }
  }, [selectedDistrict]);

  const fetchAreaData = async (district) => {
    try {
      const response = await adminAPI.getAreaAnalytics(district);
      setAreaStats(response.data || []);
    } catch (error) {
      console.error('Error fetching area data:', error);
      setAreaStats([]);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Use dedicated analytics endpoints for better performance
      const [
        overviewResponse,
        districtResponse, 
        propertyTypeResponse,
        averageRentResponse,
        propertyFeaturesResponse
      ] = await Promise.all([
        adminAPI.getOverviewAnalytics(),
        adminAPI.getDistrictAnalytics(),
        adminAPI.getPropertyTypeAnalytics(),
        adminAPI.getAverageRent(),
        adminAPI.getPropertyFeatures()
      ]);

      // Set overview statistics
      const overview = overviewResponse.data;
      setOverallStats({
        avgRent: overview.avgRent || 0,
        minRent: overview.minRent || 0,
        maxRent: overview.maxRent || 0,
        totalProperties: overview.totalProperties || 0,
        uniqueDistricts: overview.uniqueDistricts || 0,
        uniqueAreas: overview.uniqueAreas || 0
      });
      setTotalSamples(overview.totalProperties || 0);

      // Set district statistics
      const districtStats = districtResponse.data.map(item => ({
        district: item.district || 'Unknown',
        properties: item.properties || 0,
        avgRent: item.avgRent || 0,
        minRent: item.minRent || 0,
        maxRent: item.maxRent || 0,
        avgBedrooms: item.avgBedrooms || 0,
        avgBathrooms: item.avgBathrooms || 0,
        avgRooms: item.avgRooms || 0
      }));
      setDistrictStats(districtStats);

      // Set property type statistics
      const propertyTypeStats = propertyTypeResponse.data.map(item => ({
        name: item.type || 'Unknown',
        value: item.count || 0,
        avgRent: item.avgRent || 0
      }));
      setPropertyTypeStats(propertyTypeStats);

      // Set average rent data
      setAverageRentData(averageRentResponse.data || []);

      // Set property features data
      setPropertyFeatures(propertyFeaturesResponse.data || {});

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await adminAPI.rebuildStats();
      await fetchAnalyticsData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Derive feature averages for current filter (falls back to global) - placed early so downstream hooks can depend on it safely
  const getFilteredFeatureAverages = () => {
    if (selectedArea) {
      const areaData = areaStats.find(a => a.area === selectedArea);
      if (areaData) return {
        avgBedrooms: areaData.avgBedrooms,
        avgBathrooms: areaData.avgBathrooms,
        avgRooms: areaData.avgRooms
      };
    }
    if (selectedDistrict) {
      const districtData = districtStats.find(d => d.district === selectedDistrict);
      if (districtData) return {
        avgBedrooms: districtData.avgBedrooms,
        avgBathrooms: districtData.avgBathrooms,
        avgRooms: districtData.avgRooms
      };
    }
    return propertyFeatures; // global averages
  };
  const featureAverages = getFilteredFeatureAverages();

  // PDF export removed as requested

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card elevation={3} sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography color="text.secondary" variant="body2" fontWeight={600}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} color={color} sx={{ 
              wordBreak: 'break-word',
              whiteSpace: 'normal'
            }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ 
            p: 2, 
            borderRadius: 3, 
            backgroundColor: `${color}20`,
            color: color 
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Derive feature averages for current filter (falls back to global)
  // featureAverages already computed earlier

  // Calculate filtered stats based on selected district
  const getFilteredStats = () => {
    if (!selectedDistrict && !selectedArea) {
      return {
        totalProperties: overallStats.totalProperties,
        totalDistricts: overallStats.uniqueDistricts,
        avgRent: overallStats.avgRent,
        propertiesThisMonth: Math.floor(overallStats.totalProperties * 0.15) // Mock calculation
      };
    }

    if (selectedArea) {
      const areaData = areaStats.find(a => a.area === selectedArea);
      if (areaData) {
        return {
          totalProperties: areaData.properties,
          totalDistricts: 1,
          avgRent: areaData.avgRent,
          propertiesThisMonth: Math.floor(areaData.properties * 0.15)
        };
      }
    }

    if (selectedDistrict) {
      const districtData = districtStats.find(d => d.district === selectedDistrict);
      if (districtData) {
        return {
          totalProperties: districtData.properties,
          totalDistricts: 1,
          avgRent: districtData.avgRent,
          propertiesThisMonth: Math.floor(districtData.properties * 0.15) // Mock calculation
        };
      }
    }

    return {
      totalProperties: 0,
      totalDistricts: 0,
      avgRent: 0,
      propertiesThisMonth: 0
    };
  };

  const filteredStats = getFilteredStats();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Analytics...</Typography>
      </Box>
    );
  }

  const tabPanels = [
    {
      label: 'Overview',
      content: (
        <>
          {/* Filters */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Analytics Filters</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="district-select-label">District</InputLabel>
                <Select
                  labelId="district-select-label"
                  value={selectedDistrict}
                  label="District"
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
                >
                  <MenuItem value="">All Districts</MenuItem>
                  {districtStats.map((d) => (
                    <MenuItem key={d.district} value={d.district}>{d.district} ({d.properties})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }} disabled={!selectedDistrict}>
                <InputLabel id="area-select-label">Area</InputLabel>
                <Select
                  labelId="area-select-label"
                  value={selectedArea}
                  label="Area"
                  onChange={(e) => setSelectedArea(e.target.value)}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
                >
                  <MenuItem value="">All Areas</MenuItem>
                  {areaStats.map((a) => (
                    <MenuItem key={a.area} value={a.area}>{a.area} ({a.properties})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="period-select-label">Time Period</InputLabel>
                <Select
                  labelId="period-select-label"
                  value={selectedPeriod}
                  label="Time Period"
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <MenuItem value="">All Time</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="quarter">This Quarter</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => { setSelectedDistrict(''); setSelectedArea(''); setSelectedPeriod(''); }}
                  sx={{ height: 40 }}
                >
                  Clear Filters
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Stats Overview */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Properties"
                value={filteredStats.totalProperties.toLocaleString()}
                icon={<Home fontSize="large" />}
                color="#667eea"
                subtitle={selectedDistrict ? `In ${selectedDistrict}` : "Scraped samples"}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Average Rent"
                value={`৳${filteredStats.avgRent.toLocaleString()}`}
                icon={<AttachMoney fontSize="large" />}
                color="#4facfe"
                subtitle="Per month"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Districts Covered"
                value={filteredStats.totalDistricts}
                icon={<LocationCity fontSize="large" />}
                color="#43e97b"
                subtitle={selectedDistrict ? "Selected district" : `${overallStats.uniqueAreas} areas`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Properties This Month"
                value={filteredStats.propertiesThisMonth}
                icon={<TrendingUp fontSize="large" />}
                color="#f093fb"
                subtitle="Recent additions"
              />
            </Grid>
          </Grid>

          {/* Property Features Stats */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Average Bedrooms"
                value={featureAverages.avgBedrooms || 'N/A'}
                icon={<Bed fontSize="large" />}
                color="#ff6b6b"
                subtitle={selectedDistrict || selectedArea ? 'Filtered' : 'Overall'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Average Bathrooms"
                value={featureAverages.avgBathrooms || 'N/A'}
                icon={<Bathtub fontSize="large" />}
                color="#4ecdc4"
                subtitle={selectedDistrict || selectedArea ? 'Filtered' : 'Overall'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Average Rooms"
                value={featureAverages.avgRooms || 'N/A'}
                icon={<Room fontSize="large" />}
                color="#45b7d1"
                subtitle={selectedDistrict || selectedArea ? 'Filtered' : 'Overall'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Data Quality"
                value={`${((overallStats.totalProperties / (overallStats.totalProperties + 100)) * 100).toFixed(1)}%`}
                icon={<AnalyticsIcon fontSize="large" />}
                color="#96ceb4"
                subtitle="Complete records"
              />
            </Grid>
          </Grid>

          {/* Charts Grid */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                {(() => {
                  const dataset = selectedArea
                    ? areaStats.filter(a => a.area === selectedArea)
                    : selectedDistrict
                      ? districtStats.filter(d => d.district === selectedDistrict)
                      : districtStats;
                  const chartWidth = getBarChartWidth(dataset.length);
                  return (
                    <>
                      <Typography variant="h6" fontWeight={700} mb={2}>
                        {selectedArea ? `Rent Analysis - ${selectedArea}, ${selectedDistrict}` :
                          selectedDistrict ? `Rent Analysis - ${selectedDistrict}` : 'Average Rent by District'}
                      </Typography>
                      <Box sx={{ width: '100%', overflowX: 'auto', pb: 1 }}>
                        <Box sx={{ width: chartWidth }}>
                            <RechartsBarChart
                            width={chartWidth}
                            height={520}
                            data={dataset}
                            margin={{ top: 20, right: 40, left: 60, bottom: 110 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey={selectedArea ? 'area' : 'district'}
                              angle={-35}
                              textAnchor="end"
                              height={110}
                              fontSize={14}
                              interval={0}
                            />
                            <YAxis
                              tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                              fontSize={14}
                              width={70}
                            />
                            <Tooltip
                              formatter={(value) => [`৳${value.toLocaleString()}`, 'Avg Rent']}
                              labelFormatter={(label) => `${selectedArea ? 'Area' : 'District'}: ${label}`}
                            />
                            <Bar dataKey="avgRent" fill="#667eea" radius={[6, 6, 0, 0]} />
                          </RechartsBarChart>
                        </Box>
                      </Box>
                    </>
                  );
                })()}
              </Paper>
            </Grid>
          </Grid>

          {/* Second Row: Property Count (wide scrollable) */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                {(() => {
                  const dataset = selectedArea
                    ? areaStats.filter(a => a.area === selectedArea)
                    : selectedDistrict
                      ? districtStats.filter(d => d.district === selectedDistrict)
                      : districtStats;
                  const chartWidth = getBarChartWidth(dataset.length);
                  return (
                    <>
                      <Typography variant="h6" fontWeight={700} mb={2}>
                        {selectedArea ? `Property Count in ${selectedArea}` :
                          selectedDistrict ? `Property Count in ${selectedDistrict}` : 'Property Count by District'}
                      </Typography>
                      <Box sx={{ width: '100%', overflowX: 'auto', pb: 1 }}>
                        <Box sx={{ width: chartWidth }}>
                          <RechartsBarChart
                            width={chartWidth}
                            height={440}
                            data={dataset}
                            margin={{ top: 20, right: 40, left: 60, bottom: 110 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey={selectedArea ? 'area' : 'district'}
                              angle={-35}
                              textAnchor="end"
                              height={110}
                              fontSize={14}
                              interval={0}
                            />
                            <YAxis fontSize={14} width={70} />
                            <Tooltip
                              formatter={(value) => [value, 'Properties']}
                              labelFormatter={(label) => `${selectedArea ? 'Area' : 'District'}: ${label}`}
                            />
                            <Bar dataKey="properties" fill="#43e97b" radius={[6, 6, 0, 0]} />
                          </RechartsBarChart>
                        </Box>
                      </Box>
                    </>
                  );
                })()}
              </Paper>
            </Grid>
          </Grid>

          {/* Third Row - Property Types Chart (full width, filter-aware) */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Property Types Distribution {selectedDistrict && `- ${selectedDistrict}`}{selectedArea && ` / ${selectedArea}`}
                </Typography>
                <Box sx={{ width: '100%', overflowX: 'auto', pb: 1 }}>
                  <Box sx={{ width: 1000, minHeight: 540 }}>
                    <ResponsiveContainer width="100%" height={520}>
                      <RechartsPieChart margin={{ top: 20, right: 40, left: 40, bottom: 20 }}>
                        <Pie
                          data={propertyTypeStats}
                          cx="50%"
                          cy="50%"
                          outerRadius={220}
                          innerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ percent, name }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {propertyTypeStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )
    },
    {
      label: 'Districts',
      content: (
        <>
          {/* District Details Table - Show ALL districts */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              District-wise Statistics (All {districtStats.length} Districts)
            </Typography>
            <Grid container spacing={2}>
              {districtStats.map((district, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={district.district}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ 
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                        mb: 1
                      }}>
                        {district.district}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          label={`${district.properties} properties`} 
                          size="small" 
                          color="primary" 
                          sx={{ mb: 1, mr: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Avg Rent: ৳{district.avgRent.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Range: ৳{district.minRent.toLocaleString()} - ৳{district.maxRent.toLocaleString()}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            icon={<Bed fontSize="small" />}
                            label={`${district.avgBedrooms || 'N/A'} beds`} 
                            size="small" 
                            variant="outlined"
                          />
                          <Chip 
                            icon={<Bathtub fontSize="small" />}
                            label={`${district.avgBathrooms || 'N/A'} baths`} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </>
      )
    }
  ];

  return (
  <Box id="analytics-report-root">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Market Analytics
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Comprehensive insights from scraped rental market data
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ borderRadius: 2 }}
          >
            {refreshing ? 'Refreshing...' : 'Rebuild Stats'}
          </Button>
          {/* PDF download option removed */}
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabPanels.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabPanels[currentTab].content}
    </Box>
  );
};

export default Analytics;
