// Load environment variables first
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// ---- Mongoose Global Configuration ----
// Disable command buffering to control readiness explicitly
mongoose.set('bufferCommands', false);
// Disable buffering timeout to prevent the 10000ms error
mongoose.set('bufferTimeoutMS', 0);

// Import routes (it's safe to import them here)
const authRoutes = require('./backend/routes/auth');
const listingsRoutes = require('./backend/routes/listings');
const adminRoutes = require('./backend/routes/admin');
const trendsRoutes = require('./backend/routes/trends');

const app = express();

// --- Centralized Asynchronous Startup Function ---
async function startServer() {
  // 1. CONNECT TO DATABASE (with retry logic)
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('❌ MONGO_URI is not set. Server cannot start.');
    process.exit(1);
  }

  const connectWithRetry = async () => {
    try {
      console.log('🔄 Attempting MongoDB connection...');
      await mongoose.connect(mongoURI, {
        maxPoolSize: 10, // Increased pool size for better concurrency
        serverSelectionTimeoutMS: 15000, // Longer timeout for cold starts
        socketTimeoutMS: 45000, // Longer socket timeout
        connectTimeoutMS: 20000, // Longer connection timeout
        retryWrites: true,
      });
      console.log('✅ MongoDB connected successfully.');
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
      console.log('⏳ Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000); // Retry after 5s
    }
  };

  mongoose.connection.on('disconnected', () => {
    console.warn('🚨 MongoDB disconnected! Attempting to reconnect...');
    connectWithRetry();
  });

  await connectWithRetry(); // Initial connection attempt

  // 2. CONFIGURE EXPRESS MIDDLEWARE (after DB connection is initiated)
  
  // Trust proxy for deployment environments like Render/Heroku
  app.set('trust proxy', 1);

  // Security, Compression, and Logging
  app.use(helmet({
    contentSecurityPolicy: process.env.DISABLE_CSP === 'true' ? false : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts if needed, otherwise remove 'unsafe-inline'
        connectSrc: ["'self'", "https://api.mapbox.com", "ws:"] // Allow websocket connections
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  app.use(compression());
  app.use(morgan('dev')); // Use 'dev' for cleaner logs, 'combined' for production

  // CORS configuration
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.CLIENT_URL, 'https://bashalagbe.onrender.com'] // Add your production URL
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization', 'admin-token', 'x-user-id']
  };
  app.use(cors(corsOptions));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  });
  app.use('/api/', apiLimiter); // Apply rate limiter only to API routes

  // Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. DEFINE API ROUTES
  
  // Health check endpoint (does not need DB connection)
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Middleware to check for DB connection on all subsequent API routes
  const checkDBConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Service unavailable: Database not connected.' });
    }
    next();
  };
  app.use('/api', checkDBConnection); // Apply to all /api routes

  // Register API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/listings', listingsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/trends', trendsRoutes);

  // 4. SERVE STATIC ASSETS AND FRONTEND
  
  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(__dirname, 'backend/uploads')));

  // Serve React frontend for production
  if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, 'frontend/build');
    app.use(express.static(buildPath));
    // Handle React routing, return all non-API requests to React app
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }

  // 5. CONFIGURE ERROR HANDLING
  
  // 404 Not Found for any unhandled API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('🚨 UNHANDLED ERROR:', err);
    res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
  });

  // 6. START THE HTTP SERVER
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Server is live and listening on port ${PORT}`);
    console.log(`✨ Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// --- GRACEFUL SHUTDOWN ---
const shutdown = async (signal) => {
  console.log(`\n⏹️ ${signal} received, shutting down gracefully...`);
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed.');
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// --- KICK OFF THE APPLICATION ---
startServer();
