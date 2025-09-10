const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
// Load environment variables from .env when present
try { require('dotenv').config(); } catch (e) {}

const listingsRoute = require('./routes/listings');
const adminRoute = require('./routes/admin');
const authRoute = require('./routes/auth');
const trendsRoute = require('./routes/trends');
const { validateEnv } = require('./config/validateEnv');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

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
// Allow overriding CSP (e.g. temporary during debugging) with DISABLE_CSP=true
const disableCSP = process.env.DISABLE_CSP === 'true';
app.use(helmet({
  crossOriginResourcePolicy: false,
  // Only apply a custom CSP in production (or when not disabled) to prevent blocking Cloudinary images
  contentSecurityPolicy: disableCSP ? false : {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      // Permit Cloudinary, data/blobs, and general https (for potential map tiles or CDN) – tighten later if desired
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://*.cloudinary.com', 'https:'],
      mediaSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://*.cloudinary.com'],
      connectSrc: ["'self'", 'https://res.cloudinary.com', ...(process.env.ALLOW_CONNECT_EXTRA ? process.env.ALLOW_CONNECT_EXTRA.split(',').map(s=>s.trim()).filter(Boolean) : [])],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", 'blob:'],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    }
  }
}));
app.use(compression());

// Logging (skip in test environments)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(isProd ? 'combined' : 'dev'));
}

// Basic rate limiting on API in production
if (isProd) {
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  }));
}

// Body parser with sane limits
app.use(express.json({ limit: '1mb' }));

// Serve uploaded assets (ensure your reverse proxy exposes this path publicly when using local storage)
const uploadsPath = path.join(__dirname, 'uploads');
try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch {}
app.use('/uploads', express.static(uploadsPath));

// Health/status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'BashaLagbe backend',
    endpoints: ['/api/auth', '/api/listings', '/api/admin', '/api/trends']
  });
});

// API routes
app.use('/api/auth', authRoute);
app.use('/api/listings', listingsRoute);
app.use('/api/admin', adminRoute);
app.use('/api/trends', trendsRoute);

// 404 handler for unknown API routes
app.use('/api*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve frontend build and handle SPA routing
if (process.env.SERVE_FRONTEND === 'true') {
  const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
  
  if (fs.existsSync(frontendBuild)) {
    console.log('[startup] Serving frontend build from:', frontendBuild);
    
    // Serve static files (JS, CSS, images, etc.)
    app.use(express.static(frontendBuild, {
      maxAge: '1d', // Cache static assets for 1 day
      etag: false
    }));
    
    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendBuild, 'index.html'));
    });
  } else {
    console.warn('[startup] SERVE_FRONTEND=true but build folder missing:', frontendBuild);
    
    // Fallback when build folder doesn't exist
    app.get('*', (req, res) => {
      res.status(503).json({
        error: 'Frontend build not found',
        message: 'Run npm run build to create the frontend build'
      });
    });
  }
} else {
  console.log('[startup] SERVE_FRONTEND not enabled; API-only mode');
  
  // API-only mode - return service info at root
  app.get('/', (req, res) => {
    res.json({
      ok: true,
      service: 'BashaLagbe backend API',
      endpoints: ['/api/auth', '/api/listings', '/api/admin', '/api/trends']
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ error: 'Upload too large or invalid upload', code: err.code, field: err.field });
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  next();
});

// Validate env BEFORE connecting
try { validateEnv(); } catch (e) { process.exit(1); }
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    const port = process.env.PORT || 5000;
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/api/health`);
    });
  })
  .catch(err => console.error(err));

// Process-level safety
process.on('unhandledRejection', (e) => {
  console.error('Unhandled Rejection:', e);
});
process.on('uncaughtException', (e) => {
  console.error('Uncaught Exception:', e);
});

