/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const RentTrendsDashboard = () => {
  // State for filters
  const [filters, setFilters] = useState({
    area: '',
    district: '',
    minRent: '',
    maxRent: '',
    startDate: '',
    endDate: '',
    dataSource: 'both',
    propertyType: '',
    period: 'month'
  });

  // State for data and UI
  const [trendsData, setTrendsData] = useState({});
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('line');
  
  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    areas: [],
    districts: [],
    propertyTypes: []
  });

  // Colors for different locations
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  // Fetch filter options on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchFilterOptions();
    // Deliberately call once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchTrendsData(); // Load initial data
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get('/api/trends/filters');
      if (response.data.success) {
        setFilterOptions(response.data);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchTrendsData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      
      // Add non-empty filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`/api/trends?${params}`);
      
      if (response.data.success) {
        setTrendsData(response.data.data);
        setSummary(response.data.summary);
        
        // Transform data for chart consumption
        const transformedData = transformDataForChart(response.data.data);
        setChartData(transformedData);
      } else {
        setError(response.data.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching trends data:', err);
      setError('Failed to load trends data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const transformDataForChart = (data) => {
    // Get all unique periods
    const allPeriods = new Set();
    Object.values(data).forEach(locationData => {
      locationData.forEach(item => allPeriods.add(item.period));
    });

    const sortedPeriods = Array.from(allPeriods).sort();

    // Transform to chart format
    return sortedPeriods.map(period => {
      const dataPoint = { period };
      Object.keys(data).forEach(location => {
        const periodData = data[location].find(item => item.period === period);
        dataPoint[location] = periodData ? periodData.avgRent : null;
      });
      return dataPoint;
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    fetchTrendsData();
  };

  const clearFilters = () => {
    setFilters({
      area: '',
      district: '',
      minRent: '',
      maxRent: '',
      startDate: '',
      endDate: '',
      dataSource: 'both',
      propertyType: '',
      period: 'month'
    });
  };

  const exportData = () => {
    if (chartData.length === 0) return;
    
    const csvContent = [
      // Header
      ['Period', ...Object.keys(trendsData)].join(','),
      // Data rows
      ...chartData.map(row => [
        row.period,
        ...Object.keys(trendsData).map(location => row[location] || '')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent-trends-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getVisibleLocations = () => {
    return Object.keys(trendsData).slice(0, 8); // Limit to 8 for readability
  };

  const renderChart = () => {
    const locations = getVisibleLocations();
    
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters to see trends data.</p>
          </div>
        </div>
      );
    }

    const chartProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="period" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `৳${value?.toLocaleString() || 0}`}
            />
            <Tooltip
              formatter={(value, name) => [`৳${value?.toLocaleString() || 0}`, name]}
              labelFormatter={(label) => `Period: ${label}`}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            {locations.map((location, index) => (
              <Line
                key={location}
                type="monotone"
                dataKey={location}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="period" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `৳${value?.toLocaleString() || 0}`}
            />
            <Tooltip
              formatter={(value, name) => [`৳${value?.toLocaleString() || 0}`, name]}
              labelFormatter={(label) => `Period: ${label}`}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            {locations.map((location, index) => (
              <Bar
                key={location}
                dataKey={location}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Rent Price Trends Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Interactive analysis of rental market trends with real-time filtering
          </p>
        </div>

        {/* Summary Stats */}
        {summary.totalRecords > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📈</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Total Records</dt>
                  <dd className="text-2xl font-bold text-gray-900">{summary.totalRecords?.toLocaleString()}</dd>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">৳</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Avg Rent</dt>
                  <dd className="text-2xl font-bold text-gray-900">৳{summary.overallAvgRent?.toLocaleString()}</dd>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📍</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Locations</dt>
                  <dd className="text-2xl font-bold text-gray-900">{summary.locations}</dd>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Periods</dt>
                  <dd className="text-2xl font-bold text-gray-900">{summary.periods}</dd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔍 Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Location Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Area</label>
              <select
                value={filters.area}
                onChange={(e) => handleFilterChange('area', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Areas</option>
                {filterOptions.areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
              <select
                value={filters.district}
                onChange={(e) => handleFilterChange('district', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Districts</option>
                {filterOptions.districts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {/* Rent Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Rent (৳)</label>
              <input
                type="number"
                value={filters.minRent}
                onChange={(e) => handleFilterChange('minRent', e.target.value)}
                placeholder="e.g., 10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Rent (৳)</label>
              <input
                type="number"
                value={filters.maxRent}
                onChange={(e) => handleFilterChange('maxRent', e.target.value)}
                placeholder="e.g., 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
              <select
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {filterOptions.propertyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Data Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
              <select
                value={filters.dataSource}
                onChange={(e) => handleFilterChange('dataSource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">Both Sources</option>
                <option value="scraped">Scraped Data</option>
                <option value="listings">User Listings</option>
              </select>
            </div>
          </div>

          {/* Period Selection */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <div className="flex space-x-2">
                {['month', 'year'].map(period => (
                  <button
                    key={period}
                    onClick={() => handleFilterChange('period', period)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filters.period === period
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}ly
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                '🔍 Apply Filters'
              )}
            </button>
            
            <button
              onClick={clearFilters}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              🗑️ Clear All
            </button>
            
            {chartData.length > 0 && (
              <button
                onClick={exportData}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                📥 Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">📈 Rent Price Trends</h2>
            
            {/* Chart Type Toggle */}
            <div className="flex space-x-2">
              <button
                onClick={() => setChartType('line')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'line'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📈 Line Chart
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'bar'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📊 Bar Chart
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="w-full">
            {renderChart()}
          </div>

          {/* Chart Legend */}
          {Object.keys(trendsData).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Locations:</h3>
              <div className="flex flex-wrap gap-2">
                {getVisibleLocations().map((location, index) => (
                  <span
                    key={location}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: colors[index % colors.length] + '20',
                      color: colors[index % colors.length]
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    ></span>
                    {location}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentTrendsDashboard;
