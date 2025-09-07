require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
  
  // Test the trends areas endpoint
  const MarketSample = require('./models/MarketSample');
  
  async function testTrendsAPI() {
    try {
      // Test areas endpoint
      const areas = await MarketSample.distinct('area');
      const districts = await MarketSample.distinct('district');
      console.log('Areas count:', areas.length);
      console.log('Districts count:', districts.length);
      console.log('Sample areas:', areas.slice(0, 10));
      console.log('Sample districts:', districts.slice(0, 10));
      
      // Test popular areas
      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      const popularAreas = await MarketSample.aggregate([
        { $match: { createdAt: { $gte: since }, area: { $exists: true, $ne: '' } } },
        { $group: { _id: '$area', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      console.log('Popular areas:', popularAreas);
      
      // Test trends compare with top areas
      const topAreas = popularAreas.slice(0, 3).map(a => a._id);
      console.log('Testing trends compare with:', topAreas);
      
      const trendsData = await MarketSample.aggregate([
        { 
          $match: { 
            area: { $in: topAreas },
            rent: { $gt: 0 }
          } 
        },
        {
          $addFields: {
            period: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
          }
        },
        {
          $group: {
            _id: { period: '$period', area: '$area', district: '$district' },
            avgRent: { $avg: '$rent' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            period: '$_id.period',
            area: '$_id.area',
            district: '$_id.district',
            location: '$_id.area',
            avgRent: { $round: ['$avgRent', 0] },
            count: 1,
            _id: 0
          }
        },
        { $sort: { period: 1, location: 1 } }
      ]);
      
      console.log('Trends aggregation result:', trendsData);
      
      // Group the data like the API does
      const groupedData = {};
      trendsData.forEach(item => {
        if (!groupedData[item.location]) groupedData[item.location] = [];
        groupedData[item.location].push({ 
          period: item.period, 
          avgRent: item.avgRent, 
          count: item.count 
        });
      });
      console.log('Grouped data for frontend:', groupedData);
      
      process.exit(0);
    } catch (error) {
      console.error('Test error:', error);
      process.exit(1);
    }
  }
  
  testTrendsAPI();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
