const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables
try { require('dotenv').config(); } catch {}

// Import routes
const listingsRoute = require('./backend/routes/listings');
const adminRoute = require('./backend/routes/admin');
const authRoute = require('./backend/routes/auth');
const trendsRoute = require('./backend/routes/trends');

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy for Render
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (!isProd) return callback(null, true);
    
    // In production, check allowed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // For Render, allow the deployed URL
    if (origin.includes('.onrender.com')) return callback(null, true);
    
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

// Security middleware
const disableCSP = process.env.DISABLE_CSP === 'true';
if (!disableCSP) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        mediaSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://res.cloudinary.com'],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  }));
} else {
  app.use(helmet({ contentSecurityPolicy: false }));
}

// Compression and logging
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(isProd ? 'combined' : 'dev'));
}

// Rate limiting
if (isProd) {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  }));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'backend/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploads directory
app.use('/uploads', express.static(uploadsDir));

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    await mongoose.connect(mongoURI, {
      // MongoDB connection options (useNewUrlParser and useUnifiedTopology are deprecated in v4+)
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Health check endpoint
app.get('/api/health', (req, res) => {
  const buildPath = path.join(__dirname, 'frontend/build');
  res.json({
    ok: true,
    service: 'BashaLagbe API',
    environment: process.env.NODE_ENV || 'development',
    mongoStatus: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
    frontendBuild: {
      exists: fs.existsSync(buildPath),
      path: buildPath
    }
  });
});

// API routes
app.use('/api/auth', authRoute);
app.use('/api/listings', listingsRoute);
app.use('/api/admin', adminRoute);
app.use('/api/trends', trendsRoute);

// Serve static files from React build
const buildPath = path.join(__dirname, 'frontend/build');
console.log(`📁 Looking for frontend build at: ${buildPath}`);
console.log(`📁 Build exists: ${fs.existsSync(buildPath)}`);

if (fs.existsSync(buildPath)) {
  console.log('✅ Serving static files from frontend build');
  app.use(express.static(buildPath));
  
  // Handle React routing - send all non-API requests to React
  app.get('*', (req, res) => {
    console.log(`🌐 Serving React app for: ${req.path}`);
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('❌ Frontend build not found, serving API-only mode');
  // If build doesn't exist, show a helpful message
  app.get('*', (req, res) => {
    res.status(503).json({
      error: 'Frontend build not found',
      message: 'Please run "npm run build" in the frontend directory',
      buildPath: buildPath,
      currentDir: __dirname
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: isProd ? 'Something went wrong' : err.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⏹️ SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏹️ SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
