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
let authRoutes = null;
let moveinRoutes = null;
let adminRoute = null;
try { authRoutes = require('./routes/auth'); } catch (e) { /* optional */ }
try { moveinRoutes = require('./routes/movein'); } catch (e) { /* optional */ }
try { adminRoute = require('./routes/admin'); } catch (e) { /* optional */ }

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
if (moveinRoutes) app.use('/api/movein', moveinRoutes);
if (authRoutes) app.use('/api/auth', authRoutes);
if (adminRoute) app.use('/api/admin', adminRoute);

// Load cron jobs (reminders)
try { require('./cron/reminder'); } catch (e) { /* ignore if not present */ }

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

// Temporary debug route to list registered routes
app.get('/__debug/routes', (req, res) => {
  try {
    const routes = [];
    app._router.stack.forEach((m) => {
      if (m.route && m.route.path) {
        const methods = Object.keys(m.route.methods).join(',');
        routes.push({ path: m.route.path, methods });
      } else if (m.name === 'router' && m.handle && m.handle.stack) {
        m.handle.stack.forEach((r) => {
          if (r.route && r.route.path) routes.push({ path: r.route.path, methods: Object.keys(r.route.methods).join(',') });
        });
      }
    });
    res.json(routes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Temporary debug route to inspect authenticated user vs dev header
app.get('/__debug/whoami', (req, res) => {
  try {
    // Note: some older dev endpoints accepted x-user-id header for testing.
    // Production/protected endpoints now require JWT auth and ignore header-based identity.
    const headerUser = req.headers['x-user-id'] || null;
    const sessionUser = req.user || null;
    res.json({ headerUser, sessionUser, note: 'Protected endpoints ignore x-user-id; use Authorization: Bearer <token>' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = app;
