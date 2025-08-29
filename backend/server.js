const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const listingsRoute = require('./routes/listings');
const adminRoute = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded assets
const uploadsPath = path.join(__dirname, 'uploads');
try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch {}
app.use('/uploads', express.static(uploadsPath));

app.use('/api/listings', listingsRoute);
app.use('/api/admin', adminRoute);

const mongoURI = 'mongodb+srv://mahir19800:q1w2e3r4t5@cluster0.17romrq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(5000, () => console.log('Server running on port 5000'));
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

