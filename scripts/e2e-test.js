#!/usr/bin/env node
// End-to-end smoke test for auth and listings (without file uploads)
// Steps:
// 1. POST /api/auth/register
// 2. POST /api/auth/login
// 3. Insert a listing into MongoDB directly (so we avoid multipart upload complexity)
// 4. GET /api/listings (authenticated) and assert the listing exists

const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables from backend/.env or root .env if present to get MONGODB_URI
const envPaths = [path.join(__dirname, '..', 'backend', '.env'), path.join(__dirname, '..', '.env')];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}

const BASE = process.env.BASE_URL || 'http://localhost:5000';

(async function main(){
  try {
    console.log('E2E test starting against', BASE);

    // 1. Register a new user (randomized email)
    const email = `e2e_test_${Date.now()}@example.com`;
    const registerRes = await axios.post(`${BASE}/api/auth/register`, {
      name: 'E2E Test User',
      email,
      password: 'Password123!',
      role: 'owner'
    }, { timeout: 10000 });

    console.log('Register response status', registerRes.status);
    const token = registerRes.data.token;
    const user = registerRes.data.user;

    if (!token) throw new Error('No token returned from register');

    // 2. Login with same user (optional, we already have token)
    const loginRes = await axios.post(`${BASE}/api/auth/login`, {
      email,
      password: 'Password123!'
    }, { timeout: 10000 });
    console.log('Login response status', loginRes.status);
    const loginToken = loginRes.data.token;

    // 3. Insert a listing directly using mongoose to avoid file uploads
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI) throw new Error('MONGODB_URI env required for e2e insertion');

    // Use robust connection options similar to server's DB helper
    // Turn off mongoose command buffering in this script so operations fail fast on bad connection
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferTimeoutMS', 0);

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 5,
      bufferCommands: false,
      family: 4,
    });

    // Wait for mongoose open event to ensure primary selected
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('Timed out waiting for mongoose connection open')), 30000);
        mongoose.connection.once('open', () => {
          clearTimeout(to);
          resolve();
        });
      });
    }
    console.log('Connected to DB for direct insertion');
    console.log('Mongoose connection state:', mongoose.connection.readyState);
    try {
      console.log('Mongoose connection host:', mongoose.connection.host, 'port:', mongoose.connection.port, 'name:', mongoose.connection.name);
    } catch (e) { }

    // Require models after connection established to avoid index/create operations before primary selected
    const Listing = require('../backend/models/listings');

    // Ensure the server responds to a ping and that a primary is selected for writes
    try {
      const admin = mongoose.connection.db.admin();
      const pingRes = await admin.ping();
      console.log('Ping result:', pingRes);
    } catch (pingErr) {
      console.error('Ping failed prior to insert:', pingErr && pingErr.message);
      throw pingErr;
    }

    const payload = {
      userId: user.id.toString(),
      title: 'E2E Test Listing ' + Date.now(),
      type: 'Apartment',
      division: 'Dhaka',
      district: 'Dhaka',
      subdistrict: 'Dhanmondi',
      area: 'Dhanmondi',
      price: 10000,
      availableFrom: new Date(),
      rooms: 2,
      floor: 1,
      phone: '0123456789',
      photoUrls: ['/uploads/sample.jpg']
    };

    let created;
    try {
      // Try native driver insertOne to bypass potential Mongoose buffering around model-level operations
      const coll = mongoose.connection.db.collection('listings');
      const insertRes = await coll.insertOne(payload, { writeConcern: { w: 'majority' }, maxTimeMS: 30000 });
      if (!insertRes || !insertRes.insertedId) throw new Error('Native insert did not return insertedId');
      created = { _id: insertRes.insertedId.toString() };
      console.log('Native insert insertedId', created._id);
    } catch (insErr) {
      console.error('Insert error name:', insErr && insErr.name);
      console.error('Insert error message:', insErr && insErr.message);
      console.error('Insert error stack:', insErr && insErr.stack);
      try {
        console.error('Connection readyState:', mongoose.connection.readyState);
        console.error('Connection host:', mongoose.connection.host);
        console.error('Connection port:', mongoose.connection.port);
        console.error('Connection name:', mongoose.connection.name);
        console.error('Connection client available:', !!mongoose.connection.client);
      } catch (e) {}
      throw insErr;
    }

    // 4. GET /api/listings authenticated
    const getRes = await axios.get(`${BASE}/api/listings`, { headers: { Authorization: `Bearer ${loginToken}` }, timeout: 10000 });
    console.log('GET /api/listings status', getRes.status);
    const items = getRes.data || [];

    const found = items.find(i => i._id === created._id.toString() || i._id === created._id);
    if (!found) {
      console.error('Created listing not found in GET /api/listings response. Items:', items.slice(0,5));
      process.exit(2);
    }

    console.log('\u2705 E2E test passed: listing found for user');
    process.exit(0);

  } catch (err) {
    console.error('\u274c E2E test failed:', err && err.message);
    if (err && err.response && err.response.data) {
      console.error('Response data:', err.response.data);
    }
    process.exit(3);
  }
})();
