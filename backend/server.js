require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');  // connect frontend and backend
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const passport = require('./config/passport');  // Import passport config

const listingsRoute = require('./routes/listings');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true,
}));

app.use(express.json());

// Setup session middleware (required for passport sessions)
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretkey',
  resave: false,
  saveUninitialized: false,
}));

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

// Use auth routes (including Google OAuth routes inside auth.js)
app.use('/api/auth', authRoutes);

// Ensure uploads directory exists and serve static uploads
const uploadsPath = path.join(__dirname, 'uploads');
try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch (e) { /* ignore */ }
app.use('/uploads', express.static(uploadsPath));

// Listings routes
app.use('/api/listings', listingsRoute);

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(5000, () => console.log('Server running on port 5000'));
  })
  .catch(err => console.error(err));

// Global error handler for multer and general errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ error: 'Upload too large or invalid upload', code: err.code, field: err.field });
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  next();
});

// Test route to check if auth route works
app.get('/api/auth/test', (req, res) => res.send('Auth route works'));

module.exports = app;
