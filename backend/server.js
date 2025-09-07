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

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://mahir19800:q1w2e3r4t5@cluster0.17romrq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log('Server running on port', port));
  })
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

