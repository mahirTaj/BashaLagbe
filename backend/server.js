const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// Load environment variables from .env when present
try { require('dotenv').config(); } catch (e) {}

const listingsRoute = require('./routes/listings');
const adminRoute = require('./routes/admin');
const authRoute = require('./routes/auth');
const trendsRoute = require('./routes/trends');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy when behind load balancers/reverse proxies
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// CORS: lock down origins in production via env (comma-separated list)
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const devBypass = process.env.DEV_ADMIN_BYPASS === 'true';
app.use(cors({
  origin: (origin, callback) => {
    if (!isProd) return callback(null, true);
    // allow server-to-server/postman (no origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', ...(devBypass ? ['admin-token'] : [])]
}));

// Security & performance
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false // can be refined later if needed
}));
app.use(compression());

// Basic request logging (skip in test env)
if (!process.env.DISABLE_REQUEST_LOGS && process.env.NODE_ENV !== 'test') {
  app.use(morgan(isProd ? 'combined' : 'dev'));
}

// Basic rate limiting for auth & admin sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(['/api/auth', '/api/admin'], authLimiter);

// Body parser with sane limits
app.use(express.json({ limit: '1mb' }));

// Serve uploaded assets (ensure your reverse proxy exposes this path publicly when using local storage)
const uploadsPath = path.join(__dirname, 'uploads');
try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch {}
app.use('/uploads', express.static(uploadsPath));

app.use('/api/listings', listingsRoute);
app.use('/api/admin', adminRoute);
app.use('/api/auth', authRoute);
app.use('/api/trends', trendsRoute);

// Root health/status endpoint
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'BashaLagbe backend',
    endpoints: ['/api/auth', '/api/listings', '/api/admin', '/api/trends']
  });
});

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('Fatal: MONGO_URI is not set. Please configure environment variables.');
  process.exit(1);
}

let server;
mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    const port = process.env.PORT || 5000;
    server = app.listen(port, () => console.log('Server running on port', port));
  })
  .catch(err => {
    console.error('Mongo connection error:', err);
    process.exit(1);
  });

// Global error handler to make upload errors readable in the client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ error: 'Upload too large or invalid upload', code: err.code, field: err.field });
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  next();
});

// Optional: serve frontend build when co-hosting (set SERVE_FRONTEND=true)
try {
  if (process.env.SERVE_FRONTEND === 'true') {
    const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
    if (fs.existsSync(frontendBuild)) {
      app.use(express.static(frontendBuild));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(frontendBuild, 'index.html'));
      });
    }
  }
} catch {}

// Process-level safety
process.on('unhandledRejection', (e) => {
  console.error('Unhandled Rejection:', e);
});
process.on('uncaughtException', (e) => {
  console.error('Uncaught Exception:', e);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`Received ${signal}. Closing gracefully...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      mongoose.connection.close(false, () => {
        console.log('Mongo connection closed');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};
['SIGTERM','SIGINT'].forEach(sig => process.on(sig, () => shutdown(sig)));


