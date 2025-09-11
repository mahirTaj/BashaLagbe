const fetch = require('node-fetch');

async function testAPI() {
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('Testing health endpoint...');
    const healthResponse = await fetch(`${baseURL}/api/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }

    console.log('\nTesting listings endpoint...');
    const listingsResponse = await fetch(`${baseURL}/api/listings`);
    if (listingsResponse.ok) {
      const listingsData = await listingsResponse.json();
      console.log('✅ Listings endpoint working, count:', listingsData.length || 0);
      if (listingsData.length > 0) {
        console.log('Sample listing:', listingsData[0]);
      }
    } else {
      console.log('❌ Listings endpoint failed:', listingsResponse.status);
      const errorText = await listingsResponse.text();
      console.log('Error:', errorText);
    }

    console.log('\nTesting registration...');
    const registerData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'renter'
    };
    
    const registerResponse = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    });
    
    if (registerResponse.ok) {
      const registerResult = await registerResponse.json();
      console.log('✅ Registration test passed');
    } else {
      const registerError = await registerResponse.json();
      console.log('❌ Registration test failed:', registerError);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAPI();
