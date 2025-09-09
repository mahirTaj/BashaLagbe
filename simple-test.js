const http = require('http');

function testAPI() {
  console.log('Testing API...');
  
  const req = http.get('http://localhost:5000/api/listings/search?limit=2', (res) => {
    let data = '';
    
    res.on('data', chunk => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('API Response Status:', res.statusCode);
        console.log('Total listings:', json.total || 0);
        
        if (json.data && json.data.length > 0) {
          const first = json.data[0];
          console.log('\nFirst listing:');
          console.log('- Title:', first.title);
          console.log('- PhotoUrls:', first.photoUrls);
          console.log('- VideoUrl:', first.videoUrl || 'none');
          
          if (first.photoUrls && first.photoUrls.length > 0) {
            console.log('\nFirst photo URL:', first.photoUrls[0]);
            console.log('URL type:', first.photoUrls[0].includes('cloudinary') ? 'Cloudinary' : 'Local');
          }
        } else {
          console.log('No listings found');
        }
      } catch (e) {
        console.error('Parse error:', e.message);
        console.log('Raw response (first 300 chars):', data.substring(0, 300));
      }
    });
  });
  
  req.on('error', (err) => {
    console.error('Request error:', err.message);
  });
  
  req.setTimeout(10000, () => {
    console.log('Request timed out');
    req.destroy();
  });
}

testAPI();
