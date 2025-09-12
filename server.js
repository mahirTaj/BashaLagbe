// Load environment variables first
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import database connection
const { connectDB, isDBConnected, getConnectionState, getConnectionInfo, closeDB } = require('./backend/config/db');

// NOTE: Do NOT require route modules at top-level. Requiring them can execute
// code (and Mongoose queries) immediately which may run before the DB is ready.
// We'll require and mount routes after the DB connection succeeds inside startServer().

const app = express();

// --- Centralized Asynchronous Startup Function ---
async function startServer() {
  try {
    // 1. CONNECT TO DATABASE FIRST
    console.log('� Starting application...');
    console.log('🔄 Connecting to MongoDB...');

    const dbConnected = await connectDB();
    if (!dbConnected) {
      throw new Error('Failed to connect to MongoDB');
    }

    console.log('✅ Database connection established');
    console.log('� Configuring Express server...');

    // 2. CONFIGURE EXPRESS MIDDLEWARE
  
    // 3. CONFIGURE CORS FOR DEPLOYMENT
    const corsOptions = {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [];

        // Development origins
        if (process.env.NODE_ENV !== 'production') {
          allowedOrigins.push(
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://localhost:5173', // Vite dev server
            'http://localhost:8080'  // Alternative dev port
          );
        }

        // Production origins - dynamically configured
        if (process.env.NODE_ENV === 'production') {
          // Add your production frontend URLs
          allowedOrigins.push(
            'https://bashalagbe.onrender.com',
            'https://bashalagbe.vercel.app',
            'https://bashalagbe.netlify.app'
          );

          // Add custom client URL from environment
          if (process.env.CLIENT_URL) {
            allowedOrigins.push(process.env.CLIENT_URL);
          }

          // Allow all subdomains of your domain (if using custom domain)
          if (process.env.ALLOWED_DOMAINS) {
            const domains = process.env.ALLOWED_DOMAINS.split(',');
            domains.forEach(domain => {
              const cleanDomain = domain.trim();
              allowedOrigins.push(`https://${cleanDomain}`, `https://www.${cleanDomain}`);
            });
          }
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log('🚫 CORS blocked origin:', origin);
          console.log('📋 Allowed origins:', allowedOrigins);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      allowedHeaders: ['Content-Type', 'Authorization', 'admin-token', 'x-user-id', 'Accept', 'Origin', 'X-Requested-With'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
    };
    app.use(cors(corsOptions));

    // 4. BODY PARSERS - Ensure express.json() is configured
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 5. RATE LIMITING (optional - commented out for development)
    // const apiLimiter = rateLimit({
    //   windowMs: 15 * 60 * 1000, // 15 minutes
    //   max: 100,
    //   message: 'Too many requests from this IP, please try again after 15 minutes.'
    // });
    // app.use('/api/', apiLimiter);

    // 6. MIDDLEWARE TO CHECK DB CONNECTION
    const checkDBConnection = (req, res, next) => {
      if (!isDBConnected()) {
        console.error('🚫 Database not connected for request:', req.path);
        return res.status(503).json({
          message: 'Service unavailable: Database not connected.',
          dbState: getConnectionState()
        });
      }
      next();
    };

    // 7. HEALTH CHECK ENDPOINT
    app.get('/api/health', (req, res) => {
      const connectionInfo = getConnectionInfo();
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
          connected: isDBConnected(),
          state: getConnectionState(),
          name: connectionInfo.name,
          host: connectionInfo.host,
          port: connectionInfo.port,
          readyState: connectionInfo.readyState
        },
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        mongooseVersion: connectionInfo.mongooseVersion,
        nodeVersion: process.version
      });
    });

  // 8. REGISTER API ROUTES AFTER DB CONNECTION
  console.log('📋 Registering API routes...');

  // Require routes here (after DB is connected) to avoid top-level queries
  const authRoutes = require('./backend/routes/auth');
  const listingsRoutes = require('./backend/routes/listings');
  const adminRoutes = require('./backend/routes/admin');
  const trendsRoutes = require('./backend/routes/trends');

  // Apply DB connection check to all API routes
  app.use('/api/auth', checkDBConnection, authRoutes);
  app.use('/api/listings', checkDBConnection, listingsRoutes);
  app.use('/api/admin', checkDBConnection, adminRoutes);
  app.use('/api/trends', checkDBConnection, trendsRoutes);

  console.log('✅ API routes registered successfully');

    // 9. SERVE STATIC ASSETS AND FRONTEND
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

    // 10. ERROR HANDLING
    // 404 Not Found for any unhandled API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({ message: 'API route not found' });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error('🚨 UNHANDLED ERROR:', err);

      // Handle CORS errors specifically
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
          message: 'CORS policy violation',
          error: 'Origin not allowed'
        });
      }

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
      });
    });

    // 11. START THE HTTP SERVER ONLY AFTER EVERYTHING IS READY
    const PORT = process.env.PORT || 5000;
    console.log(`🚀 Starting server on port ${PORT}...`);

    const server = app.listen(PORT, () => {
      console.log(`✅ Server is live and listening on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Database: ${getConnectionState()}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('🚨 Server error:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Full error:', error);

    // In production, attempt restart after delay
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Attempting server restart in 10 seconds...');
      setTimeout(() => {
        startServer();
      }, 10000);
    } else {
      process.exit(1);
    }
  }
}// --- GRACEFUL SHUTDOWN ---
process.on('SIGTERM', async () => {
  console.log('\n⏹️ SIGTERM received, shutting down gracefully...');
  try {
    await closeDB();
    console.log('🔌 MongoDB connection closed.');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⏹️ SIGINT received, shutting down gracefully...');
  try {
    await closeDB();
    console.log('🔌 MongoDB connection closed.');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
  process.exit(0);
});

// --- KICK OFF THE APPLICATION ---
console.log('🚀 Starting Basha Lagbe application...');
startServer().catch((error) => {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
});
