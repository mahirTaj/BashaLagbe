const https = require('https');
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode === 200, json, status: res.statusCode });
        } catch (e) {
          resolve({ ok: res.statusCode === 200, text: data, status: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testAPI() {
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('Testing health endpoint...');
    const healthResponse = await makeRequest(`${baseURL}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ Health check passed:', healthResponse.json);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }

    console.log('\nTesting listings endpoint...');
    const listingsResponse = await makeRequest(`${baseURL}/api/listings`);
    if (listingsResponse.ok) {
      console.log('✅ Listings endpoint working, count:', listingsResponse.json.length || 0);
      if (listingsResponse.json.length > 0) {
        console.log('Sample listing title:', listingsResponse.json[0].title);
      }
    } else {
      console.log('❌ Listings endpoint failed:', listingsResponse.status);
      console.log('Error:', listingsResponse.text || listingsResponse.json);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAPI();
