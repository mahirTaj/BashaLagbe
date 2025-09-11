const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
try { require('dotenv').config(); } catch {}

const listingsRoute = require('./routes/listings');
const adminRoute = require('./routes/admin');
const authRoute = require('./routes/auth');
const trendsRoute = require('./routes/trends');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const devBypass = process.env.DEV_ADMIN_BYPASS === 'true';
app.use(cors({
  origin: (origin, callback) => {
    if (!isProd) return callback(null, true);
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', ...(devBypass ? ['admin-token'] : [])]
}));

const disableCSP = process.env.DISABLE_CSP === 'true';
const extraImg = (process.env.CSP_IMG_EXTRA || '').split(',').map(s=>s.trim()).filter(Boolean);
const extraConnect = (process.env.ALLOW_CONNECT_EXTRA || '').split(',').map(s=>s.trim()).filter(Boolean);
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', ...extraImg],
  mediaSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
  connectSrc: ["'self'", 'https://res.cloudinary.com', ...extraConnect],
  objectSrc: ["'none'"],
  frameSrc: ["'none'"],
  workerSrc: ["'self'", 'blob:'],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: disableCSP ? false : { useDefaults: false, directives: cspDirectives }
}));
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(isProd ? 'combined' : 'dev'));
}

if (isProd) {
  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
}

app.use(express.json({ limit: '1mb' }));

// Serve uploaded assets (local). Note: On Vercel, use Cloudinary. Local disk is ephemeral.
const uploadsPath = path.join(__dirname, 'uploads');
try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch {}
app.use('/uploads', express.static(uploadsPath));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'BashaLagbe backend', endpoints: ['/api/auth', '/api/listings', '/api/admin', '/api/trends'] });
});

app.get('/api/debug/config', (req, res) => {
  res.json({
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DISABLE_CSP: process.env.DISABLE_CSP,
      TRUST_PROXY: process.env.TRUST_PROXY,
      DEBUG_AUTH: process.env.DEBUG_AUTH,
    }
  });
});

app.use('/api/auth', authRoute);
app.use('/api/listings', listingsRoute);
app.use('/api/admin', adminRoute);
app.use('/api/trends', trendsRoute);

app.use('/api*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ error: 'Upload too large or invalid upload', code: err.code, field: err.field });
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  next();
});

// Connect to Mongo once (works for serverless warm starts)
const mongoURI = process.env.MONGO_URI;
let mongoConnectingPromise = null;
function ensureMongoConnected() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (mongoConnectingPromise) return mongoConnectingPromise;
  mongoConnectingPromise = mongoose.connect(mongoURI).then(() => {
    console.log('MongoDB connected');
  }).catch(err => {
    console.error('Mongo connect error', err);
    mongoConnectingPromise = null;
    throw err;
  });
  return mongoConnectingPromise;
}

// Attach a guard to connect on first API request
app.use(async (req, res, next) => {
  try { await ensureMongoConnected(); next(); } catch (e) { res.status(503).json({ error: 'Database not ready' }); }
});

module.exports = app;
