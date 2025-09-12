// NOTE: This file mirrors the root server.js for cases where a platform start command points here.
// Prefer using the root-level server.js to avoid duplication.

// Load environment variables.
// If the process is started from the backend folder, prefer loading the workspace root `.env`
// so shared secrets (MONGO_URI, CLOUDINARY_*) defined at project root are available.
try {
  const path = require('path');
  const dotenv = require('dotenv');
  // Attempt to load root .env first (one level up)
  const rootEnv = path.resolve(__dirname, '..', '.env');
  const backendEnv = path.resolve(__dirname, '.env');
  let loaded = false;
  try {
    const r = dotenv.config({ path: rootEnv });
    if (!r.error) { console.log('[backend] Loaded env from workspace root .env'); loaded = true; }
  } catch (e) {}
  // Always also try to load backend/.env so local overrides work
  try {
    const b = dotenv.config({ path: backendEnv });
    if (!b.error) { console.log('[backend] Loaded env from backend/.env'); loaded = true; }
  } catch (e) {}
  if (!loaded) {
    // Fallback to default behavior (dotenv will look for .env in cwd)
    try { dotenv.config(); } catch (e) {}
  }
} catch (e) {
  // If dotenv isn't available for some reason, proceed — process.env may already be set in the environment
}
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
  try {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[backend] 🚀 Listening on ${port} (dbState=${mongoose.connection.readyState})`);
    });
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`[backend] 🚫 Port ${port} already in use. Another process may be running.`);
        // Do not crash the process; leave connection retry logic (if any) to the caller.
      } else {
        console.error('[backend] Server error:', err);
      }
    });
  } catch (err) {
    console.error('[backend] Failed to start server:', err);
  }
}

init();

// Global error handlers to improve debugging during development
process.on('unhandledRejection', (reason, p) => {
  console.error('[backend] UNHANDLED REJECTION at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[backend] UNCAUGHT EXCEPTION:', err);
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log full error for debugging (includes stack)
  try { console.error('[backend] GLOBAL ERROR:', err && err.stack ? err.stack : err); } catch (e) { console.error('[backend] Failed to log error', e); }
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ error: 'Upload too large', code: err.code });
  }
  if (err) return res.status(500).json({ error: err.message || 'Server error' });
  next();
});


process.on('SIGTERM', async () => { await mongoose.connection.close(); process.exit(0); });
process.on('SIGINT', async () => { console.log('SIGINT received, ignoring'); await mongoose.connection.close(); });

// Only start the server if this file is run directly (not imported as a module)
if (require.main === module) {
  init();
}


