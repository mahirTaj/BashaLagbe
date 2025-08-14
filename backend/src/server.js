require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./db');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// DB
connectDB(process.env.MONGO_URI);

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/mod', require('./routes/mod.routes'));

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));