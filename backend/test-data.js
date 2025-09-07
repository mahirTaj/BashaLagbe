require('dotenv').config();
const mongoose = require('mongoose');
const MarketSample = require('./models/MarketSample');

async function testData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check total count
    const total = await MarketSample.countDocuments();
    console.log('Total MarketSample records:', total);
    
    // Check areas with data
    const areas = await MarketSample.aggregate([
      { $group: { _id: '$area', count: { $sum: 1 }, avgRent: { $avg: '$rent' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    console.log('Top 10 areas:', areas);
    
    // Check districts
    const districts = await MarketSample.aggregate([
      { $group: { _id: '$district', count: { $sum: 1 }, avgRent: { $avg: '$rent' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    console.log('Top 10 districts:', districts);
    
    // Check date range
    const dateRange = await MarketSample.aggregate([
      { $group: { 
        _id: null, 
        minDate: { $min: '$createdAt' }, 
        maxDate: { $max: '$createdAt' } 
      }}
    ]);
    console.log('Date range:', dateRange);
    
    // Sample records
    const samples = await MarketSample.find().limit(5);
    console.log('Sample records:', JSON.stringify(samples, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testData();
