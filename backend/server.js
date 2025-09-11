const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
// Load environment variables from .env when present
try { require('dotenv').config(); } catch (e) {}

const listingsRoute = require('./routes/listings');
const adminRoute = require('./routes/admin');
const authRoute = require('./routes/auth');
const trendsRoute = require('./routes/trends');

const app = express();

app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'admin-token', 'x-user-id']
}));
app.use(express.json());

// Serve uploaded assets
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

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://mahir19800:q1w2e3r4t5@cluster0.17romrq.mongodb.net/bashalagbe?retryWrites=true&w=majority&appName=Cluster0';

// MongoDB connection with proper timeout settings
const connectDB = async () => {
  try {
    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      // Connection options
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      bufferMaxEntries: 0,
      bufferCommands: false,
      connectTimeoutMS: 30000,
      family: 4, // Use IPv4, skip trying IPv6
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('🔧 Check your MONGO_URI and network access settings');
    
    // In production, don't exit, let health checks handle it
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Connect to database
connectDB();

// Start server
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});
  .catch(err => console.error(err));

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

