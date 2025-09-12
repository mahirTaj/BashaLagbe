#!/usr/bin/env node
// Simple deployment verification script that requests /api/health
const http = require('http');
const url = process.env.VERIFY_URL || 'http://localhost:5000/api/health';

console.log('Verifying deployment health at', url);

const req = http.get(url, { timeout: 5000 }, (res) => {
  const { statusCode } = res;
  let raw = '';
  res.on('data', (chunk) => (raw += chunk));
  res.on('end', () => {
    try {
      const obj = JSON.parse(raw);
      console.log('Response:', JSON.stringify(obj, null, 2));
    } catch (e) {
      console.log('Non-JSON response:', raw);
    }

    if (statusCode >= 200 && statusCode < 300) {
      console.log('\u2705 Health check passed');
      process.exit(0);
    }
    console.error('\u274c Health check failed with status', statusCode);
    process.exit(2);
  });
});

req.on('error', (err) => {
  console.error('\u274c Request error:', err.message);
  process.exit(3);
});

req.on('timeout', () => {
  console.error('\u274c Request timed out');
  req.destroy();
  process.exit(4);
});
