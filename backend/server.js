// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
require('dotenv').config();

const listingsRoute = require('./routes/listings');
const messageRoutes = require('./routes/messages');
const wishlistRoutes = require('./routes/wishlist');
const notificationsRoute = require('./routes/notifications');

const { initSocketIO, getIO } = require('./socket'); // ✅ use getIO here

const app = express();
const server = http.createServer(app);

// ✅ Initialize socket.io ONCE, and keep the reference
initSocketIO(server);

app.use(cors());
app.use(express.json());

// Serve uploaded assets
const uploadsPath = path.join(__dirname, 'uploads');
try {
  fs.mkdirSync(uploadsPath, { recursive: true });
} catch {}
app.use('/uploads', express.static(uploadsPath));

// API routes
app.use('/api/listings', listingsRoute);
app.use('/api/messages', messageRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationsRoute);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error(err));

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(413).json({
      error: 'Upload too large or invalid upload',
      code: err.code,
      field: err.field,
    });
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  next();
});

// ✅ No `module.exports.io` here anymore → use getIO() in utils
