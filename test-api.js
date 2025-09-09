const http = require('http');

console.log('Testing API at localhost:5000...');

const req = http.get('http://localhost:5000/api/listings/search?limit=1', (res) => {
  let data = '';
  
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n=== API Response ===');
      console.log('Status:', res.statusCode);
      console.log('Total listings:', json.total || 0);
      
      if (json.data && json.data.length > 0) {
        const first = json.data[0];
        console.log('\nFirst listing:');
        console.log('- Title:', first.title);
        console.log('- PhotoUrls:', first.photoUrls);
        console.log('- VideoUrl:', first.videoUrl || 'none');
        
        if (first.photoUrls && first.photoUrls.length > 0) {
          console.log('\nTesting first photo URL...');
          console.log('URL:', first.photoUrls[0]);
          
          // Test if the photo URL is accessible
          const photoUrl = first.photoUrls[0];
          if (photoUrl.startsWith('http')) {
            const photoReq = http.get(photoUrl, (photoRes) => {
              console.log('Photo URL status:', photoRes.statusCode);
              console.log('Photo content-type:', photoRes.headers['content-type']);
              photoRes.destroy();
            });
            photoReq.on('error', err => {
              console.log('Photo URL error:', err.message);
            });
          } else {
            console.log('Photo URL is not absolute:', photoUrl);
          }
        }
      } else {
        console.log('No listings found in response');
      }
    } catch (e) {
      console.log('JSON Parse error:', e.message);
      console.log('Raw response (first 200 chars):', data.substring(0, 200));
    }
  });
});

req.on('error', (err) => {
  console.log('Request error:', err.message);
});

req.setTimeout(10000, () => {
  console.log('Request timed out');
  req.destroy();
});
