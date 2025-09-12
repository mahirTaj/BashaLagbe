// NOTE: This file mirrors the root server.js for cases where a platform start command points here.
// Prefer using the root-level server.js to avoid duplication.

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// --- Mongoose Global Settings ---
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);

const listingsRoute = require('./routes/listings');
const adminRoute = require('./routes/admin');
const authRoute = require('./routes/auth');
const trendsRoute = require('./routes/trends');

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'admin-token', 'x-user-id']
}));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded assets
const uploadsPath = path.join(__dirname, 'uploads');
try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch {}
app.use('/uploads', express.static(uploadsPath));

// DB connection checker
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected', state: mongoose.connection.readyState });
  }
  next();
};

// Attach routes (guarded)
app.use('/api/listings', checkDBConnection, listingsRoute);
app.use('/api/admin', checkDBConnection, adminRoute);
app.use('/api/auth', checkDBConnection, authRoute);
app.use('/api/trends', checkDBConnection, trendsRoute);

// Root status
app.get('/', (req, res) => {
  res.json({ ok: true, entry: 'backend/server.js', dbState: mongoose.connection.readyState });
});

// Debug DB state
app.get('/api/_debug/db', (req, res) => {
  res.json({ state: mongoose.connection.readyState, ready: mongoose.connection.readyState === 1 });
});

// Health
app.get('/api/health', (req, res) => {
  const stateMap = {0:'disconnected',1:'connected',2:'connecting',3:'disconnecting'};
  res.json({ service:'backend', state: stateMap[mongoose.connection.readyState], readyState: mongoose.connection.readyState, env: process.env.NODE_ENV });
});

// --- Connection Logic ---
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI missing (backend/server.js)');
    return false;
  }
  const masked = uri.replace(/:(.*?)@/, ':****@');
  console.log('[backend] Mongo URI:', masked);
  let attempt = 0; const max = 3;
  while (attempt < max) {
    attempt++;
    try {
      console.log(`[backend] 🔄 Connecting (${attempt}/${max})`);
      await mongoose.connect(uri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 20000,
        connectTimeoutMS: 10000,
        retryWrites: true,
      });
      console.log('[backend] ✅ MongoDB connected');
      return true;
    } catch (e) {
      console.error(`[backend] ❌ Attempt ${attempt} failed: ${e.message}`);
      if (attempt < max) { await new Promise(r=>setTimeout(r,5000)); }
    }
  }
  console.error('[backend] 🚫 All attempts failed');
  return false;
};

let started = false;
async function init() {
  const ok = await connectDB();
  start();
  if (!ok) {
    setInterval(async () => {
      if (mongoose.connection.readyState !== 1) {
        try { await mongoose.connect(process.env.MONGO_URI); console.log('[backend] ♻️ Reconnected'); } catch {}
      }
    }, 15000);
  }
}

function start() {
  if (started) return; started = true;
  const port = process.env.PORT || 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[backend] 🚀 Listening on ${port} (dbState=${mongoose.connection.readyState})`);
  });
}

init();

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ error: 'Upload too large', code: err.code });
  }
  if (err) return res.status(500).json({ error: err.message || 'Server error' });
  next();
});


process.on('SIGTERM', async () => { await mongoose.connection.close(); process.exit(0); });
process.on('SIGINT', async () => { console.log('SIGINT received, ignoring'); await mongoose.connection.close(); });


