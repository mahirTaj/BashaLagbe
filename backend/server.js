const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');                  // ✅ NEW: for Socket.IO
const { Server } = require('socket.io');       // ✅ NEW: Socket.IO
require('dotenv').config();

const listingsRoute = require('./routes/listings');
const messageRoutes = require('./routes/messages');
const wishlistRoutes = require('./routes/wishlist');
const { initSocketIO } = require('./socket');  // ✅ NEW: our socket setup

const app = express();
const server = http.createServer(app);  
const notificationsRoute = require('./routes/notifications');
app.use('/api/notifications', notificationsRoute);

       // ✅ wrap app in HTTP server

// ✅ NEW: set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',  // adjust for your frontend URL
    methods: ['GET', 'POST'],
    credentials: true
  }
});
initSocketIO(server);                           // ✅ call our socket handler

// ----- ADD: Expose io globally to routes/middleware (non-intrusive) -----
app.set('io', io);                             // ADD: make io available via req.app.get('io')
app.use((req, res, next) => {                  // ADD: direct access as req.io for convenience
  req.io = io;
  next();
});
// ------------------------------------------------------------------------

// ✅ EXPORT io so utils/sendNotification.js can import it
module.exports.io = io;

app.use(cors());
app.use(express.json());

// Serve uploaded assets
const uploadsPath = path.join(__dirname, 'uploads');
try {
  fs.mkdirSync(uploadsPath, { recursive: true });
} catch {}
app.use('/uploads', express.static(uploadsPath));

app.use('/api/listings', listingsRoute);
app.use('/api/messages', messageRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const mongoURI =
  process.env.MONGO_URI ||
  'mongodb+srv://mahir19800:q1w2e3r4t5@cluster0.17romrq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    // ✅ listen with the HTTP server, not app.listen
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error(err));

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res
      .status(413)
      .json({
        error: 'Upload too large or invalid upload',
        code: err.code,
        field: err.field,
      });
  }
  if (err) {
    return res
      .status(500)
      .json({ error: err.message || 'Server error' });
  }
  next();
});