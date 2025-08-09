const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const listingsRoute = require('./routes/listings');

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/listings', listingsRoute);

const mongoURI = 'mongodb+srv://mahir19800:q1w2e3r4t5@cluster0.17romrq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(5000, () => console.log('Server running on port 5000'));
  })
  .catch(err => console.error(err));

