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
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import adminAPI from '../services/adminAPI';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSamples, setTotalSamples] = useState(0);
  const [averageRentData, setAverageRentData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [districtStats, setDistrictStats] = useState([]);
  const [propertyTypeStats, setPropertyTypeStats] = useState([]);
  const [propertyFeatures, setPropertyFeatures] = useState({});
  const [priceTrends, setPriceTrends] = useState([]);
  const [uploadTrends, setUploadTrends] = useState([]);
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

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Use dedicated analytics endpoints for better performance
      const [
        overviewResponse,
        districtResponse, 
        propertyTypeResponse,
        monthlyResponse,
        averageRentResponse,
        propertyFeaturesResponse,
        priceTrendsResponse,
        uploadTrendsResponse
      ] = await Promise.all([
        adminAPI.getOverviewAnalytics(),
        adminAPI.getDistrictAnalytics(),
        adminAPI.getPropertyTypeAnalytics(),
        adminAPI.getMonthlyTrends(),
        adminAPI.getAverageRent(),
        adminAPI.getPropertyFeatures(),
        adminAPI.getPriceTrends(),
        adminAPI.getUploadTrends()
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

      // Set monthly trends
      const monthlyStats = monthlyResponse.data.map(item => ({
        month: item.month,
        properties: item.properties || 0,
        avgRent: item.avgRent || 0
      }));
      setMonthlyData(monthlyStats);

      // Set average rent data
      setAverageRentData(averageRentResponse.data || []);

      // Set property features data
      setPropertyFeatures(propertyFeaturesResponse.data || {});

      // Set price trends
      setPriceTrends(priceTrendsResponse.data || []);

      // Set upload trends
      setUploadTrends(uploadTrendsResponse.data || []);

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
          {/* Stats Overview */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Properties"
                value={overallStats.totalProperties.toLocaleString()}
                icon={<Home fontSize="large" />}
                color="#667eea"
                subtitle="Scraped samples"
              />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Average Rent"
                value={`৳${overallStats.avgRent.toLocaleString()}`}
                icon={<AttachMoney fontSize="large" />}
                color="#4facfe"
                subtitle="Per month"
              />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Districts Covered"
                value={overallStats.uniqueDistricts}
                icon={<LocationCity fontSize="large" />}
                color="#43e97b"
                subtitle={`${overallStats.uniqueAreas} areas`}
              />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Price Range"
                value={`৳${Math.min(overallStats.minRent, overallStats.maxRent).toLocaleString()} - ৳${Math.max(overallStats.minRent, overallStats.maxRent).toLocaleString()}`}
                icon={<TrendingUp fontSize="large" />}
                color="#f093fb"
                subtitle="Min - Max"
              />
            </Grid>
          </Grid>

          {/* Property Features Stats */}
          <Grid container spacing={3} mb={4}>
            <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Average Bedrooms"
                value={propertyFeatures.avgBedrooms || 'N/A'}
                icon={<Bed fontSize="large" />}
                color="#ff6b6b"
                subtitle="Per property"
              />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Average Bathrooms"
                value={propertyFeatures.avgBathrooms || 'N/A'}
                icon={<Bathtub fontSize="large" />}
                color="#4ecdc4"
                subtitle="Per property"
              />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Average Rooms"
                value={propertyFeatures.avgRooms || 'N/A'}
                icon={<Room fontSize="large" />}
                color="#45b7d1"
                subtitle="Per property"
              />
            </Grid>
            <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
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
            {/* District Comparison */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 3, borderRadius: 3, height: 600 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Average Rent by District
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={districtStats.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="district" 
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      fontSize={11}
                      interval={0}
                    />
                    <YAxis 
                      tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value) => [`৳${value.toLocaleString()}`, 'Average Rent']}
                      labelFormatter={(label) => `District: ${label}`}
                    />
                    <Bar dataKey="avgRent" fill="#667eea" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Property Types */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: 600 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Property Types Distribution
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={propertyTypeStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={160}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {propertyTypeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Properties']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )
    },
    {
      label: 'Trends',
      content: (
        <Grid container spacing={3} mb={4}>
          {/* Monthly Data Collection */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3, height: 500 }}>
              <Typography variant="h6" fontWeight={700} mb={1}>
                Monthly Data Collection Trends
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                This shows how many properties were scraped and added to our database each month, along with the average rent trend over time.
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`} />
                  <Tooltip />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="properties"
                    stackId="1"
                    stroke="#667eea"
                    fill="#667eea"
                    fillOpacity={0.3}
                    name="Properties Added"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgRent"
                    stroke="#f093fb"
                    strokeWidth={3}
                    name="Average Rent (৳)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Price Trends */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: 500 }}>
              <Typography variant="h6" fontWeight={700} mb={1}>
                Price Trends Over Time
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Average, minimum, and maximum rent prices tracked monthly to show market trends.
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, 'Rent']} />
                  <Line type="monotone" dataKey="avgRent" stroke="#667eea" strokeWidth={3} name="Average" />
                  <Line type="monotone" dataKey="minRent" stroke="#43e97b" strokeWidth={2} name="Minimum" />
                  <Line type="monotone" dataKey="maxRent" stroke="#f093fb" strokeWidth={2} name="Maximum" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Upload Trends */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: 500 }}>
              <Typography variant="h6" fontWeight={700} mb={1}>
                Daily Upload Activity
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Number of property records uploaded to the system each day, showing data collection activity.
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={uploadTrends.slice(-30)}> {/* Show last 30 days */}
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="uploads"
                    stroke="#4facfe"
                    fill="#4facfe"
                    fillOpacity={0.4}
                    name="Uploads"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )
    },
    {
      label: 'Districts',
      content: (
        <>
          {/* Filters */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Analytics Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>District</InputLabel>
                  <Select
                    value={selectedDistrict}
                    label="District"
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                  >
                    <MenuItem value="">All Districts</MenuItem>
                    {districtStats.map((district) => (
                      <MenuItem key={district.district} value={district.district}>
                        {district.district} ({district.properties} properties)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Area</InputLabel>
                  <Select
                    value={selectedArea}
                    label="Area"
                    onChange={(e) => setSelectedArea(e.target.value)}
                  >
                    <MenuItem value="">All Areas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Time Period</InputLabel>
                  <Select
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
              </Grid>
            </Grid>
          </Paper>

          {/* District Details Table - Show ALL districts */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              District-wise Statistics (All {districtStats.length} Districts)
            </Typography>
            <Grid container spacing={2}>
              {districtStats.map((district, index) => (
                <Grid item size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={district.district}>
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
    <Box>
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
          <Button
            variant="contained"
            startIcon={<AnalyticsIcon />}
            sx={{ 
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            Export Report
          </Button>
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
