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

// Import routes from backend
const authRoutes = require('./backend/routes/auth');
const listingsRoutes = require('./backend/routes/listings');
const adminRoutes = require('./backend/routes/admin');
const trendsRoutes = require('./backend/routes/trends');

const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// MongoDB connection with improved timeout handling and retry logic
const connectDB = async () => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      const mongoURI = process.env.MONGO_URI;
      if (!mongoURI) {
        throw new Error('MONGO_URI environment variable is not set');
      }
      
      console.log(`🔄 Connecting to MongoDB... (Attempt ${4 - retries}/3)`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      const conn = await mongoose.connect(mongoURI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 60000, // Increased to 60 seconds
        socketTimeoutMS: 75000, // Increased to 75 seconds
        connectTimeoutMS: 60000, // Increased to 60 seconds
        heartbeatFrequencyMS: 10000, // Check connection every 10 seconds
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
      });
      
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);
      console.log(`🔌 Connection State: ${conn.connection.readyState}`);
      return; // Success, exit retry loop
      
    } catch (error) {
      retries--;
      console.error(`❌ MongoDB connection error (${3 - retries}/3): ${error.message}`);
      
      if (retries === 0) {
        console.error('🔧 Troubleshooting tips:');
        console.error('   1. Check MONGO_URI format');
        console.error('   2. Verify MongoDB Atlas network access (0.0.0.0/0)');
        console.error('   3. Ensure database user has proper permissions');
        console.error('   4. Check if MongoDB cluster is running');
        
        // In production, don't exit immediately, let health check handle it
        if (process.env.NODE_ENV !== 'production') {
          process.exit(1);
        }
      } else {
        console.log(`⏳ Retrying in 5 seconds... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
};

// Connect to database
connectDB();

// Middleware
app.use(morgan('combined'));
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CLIENT_URL || 'https://your-app-name.onrender.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization', 'admin-token', 'x-user-id']
};
app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.DISABLE_CSP === 'true' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.mapbox.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const dbState = {
    0: 'disconnected',
    1: 'connected', 
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      state: dbState[mongoose.connection.readyState],
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown'
    },
    environment: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI ? 'configured' : 'missing',
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    }
  });
});

// Middleware to check database connection
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.error(`❌ API request to ${req.path} rejected - DB not connected (state: ${mongoose.connection.readyState})`);
    return res.status(503).json({
      error: 'Database connection unavailable',
      message: 'Please try again in a moment',
      dbState: mongoose.connection.readyState
    });
  }
  next();
};

// API routes with database connection check
app.use('/api/auth', checkDBConnection, authRoutes);
app.use('/api/listings', checkDBConnection, listingsRoutes);
app.use('/api/admin', checkDBConnection, adminRoutes);
app.use('/api/trends', checkDBConnection, trendsRoutes);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'backend/uploads')));

// Serve React frontend
const buildPath = path.join(__dirname, 'frontend/build');
app.use(express.static(buildPath));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Handle unhandled routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
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
