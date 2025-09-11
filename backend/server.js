const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
// Load environment variables from .env when present
try { require('dotenv').config(); } catch (e) {}

const listingsRoute = require('./routes/listings');
// Local entrypoint wraps shared express app (used by Vercel serverless in server-express.js)
const app = require('./server-express');
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running (standalone) on port ${port}`);
});

// Process-level safety
process.on('unhandledRejection', (e) => {
  console.error('Unhandled Rejection:', e);
});
process.on('uncaughtException', (e) => {
  console.error('Uncaught Exception:', e);
});

