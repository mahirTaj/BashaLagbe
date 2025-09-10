const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

// Load environment variables from .env when present
try { require('dotenv').config(); } catch (e) {}

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy when behind load balancers/reverse proxies
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'BashaLagbe backend (debug)',
    message: 'Server starting successfully'
  });
});

console.log('Loading auth route...');
try {
  const authRoute = require('./routes/auth');
  app.use('/api/auth', authRoute);
  console.log('Auth route loaded successfully');
} catch (e) {
  console.error('Auth route failed:', e.message);
}

console.log('Loading trends route...');
try {
  const trendsRoute = require('./routes/trends');
  app.use('/api/trends', trendsRoute);
  console.log('Trends route loaded successfully');
} catch (e) {
  console.error('Trends route failed:', e.message);
}

console.log('Loading admin route...');
try {
  const adminRoute = require('./routes/admin');
  app.use('/api/admin', adminRoute);
  console.log('Admin route loaded successfully');
} catch (e) {
  console.error('Admin route failed:', e.message);
}

console.log('Loading listings route...');
try {
  const listingsRoute = require('./routes/listings');
  app.use('/api/listings', listingsRoute);
  console.log('Listings route loaded successfully');
} catch (e) {
  console.error('Listings route failed:', e.message);
}

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
const port = process.env.PORT || 5000;

console.log('Connecting to MongoDB...');
mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
