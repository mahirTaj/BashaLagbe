const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

// Create test tokens for the users who have reports
const userIds = [
  '68b5b4b6fa3518ab0cb4a5b2', // has 3 reports
  '68b4c67456d1ecce005850c1', // has 1 report  
  '68b52e699b0b2fbb47d2269d', // has 1 report
  '68b4ade0db47b359428b62ea'  // has 1 report
];

console.log('Test tokens for users with reports:');
userIds.forEach(userId => {
  const token = jwt.sign({ sub: userId, role: 'renter' }, JWT_SECRET, { expiresIn: '24h' });
  console.log(`\nUser ${userId}:`);
  console.log(`Token: ${token}`);
  console.log(`Test with: curl -H "Authorization: Bearer ${token}" http://localhost:5000/api/listings/my-reports`);
});

// Also create admin token
const adminToken = jwt.sign({ sub: '68b575c8af2445e815d3b33f', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
console.log(`\nAdmin user:`);
console.log(`Token: ${adminToken}`);
console.log(`Test with: curl -H "Authorization: Bearer ${adminToken}" http://localhost:5000/api/listings/my-reports`);
