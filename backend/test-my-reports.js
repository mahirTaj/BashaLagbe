// Simple test to validate My Reports is working
const axios = require('axios');

async function testMyReports() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGI1YjRiNmZhMzUxOGFiMGNiNGE1YjIiLCJyb2xlIjoicmVudGVyIiwiaWF0IjoxNzU3MjYyNjA1LCJleHAiOjE3NTczNDkwMDV9.YiUoz36noopqW9onYiacJmepYaX_VFSVKTCSCobIi70';
  
  try {
    console.log('Testing My Reports endpoint...');
    const response = await axios.get('http://localhost:5000/api/listings/my-reports', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ SUCCESS: My Reports is working!');
    console.log('Reports count:', response.data.length);
    console.log('Sample report:', response.data[0] ? {
      id: response.data[0]._id,
      type: response.data[0].reportType,
      reason: response.data[0].reason,
      status: response.data[0].status,
      targetTitle: response.data[0].targetTitle
    } : 'No reports');
    
  } catch (err) {
    console.error('❌ FAILED:', err?.response?.data || err.message);
  }
}

testMyReports();
