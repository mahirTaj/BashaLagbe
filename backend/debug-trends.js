const mongoose = require('mongoose');
require('dotenv').config();

async function debugTrendsData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const MarketSample = require('./models/MarketSample');
    const Listing = require('./models/listings');
    
    console.log('\n=== DEBUG TRENDS DATA ===');
    
    // Check Airport area data in MarketSample
    console.log('\n1. Airport area data in MarketSample:');
    const airportData = await MarketSample.find({ 
      area: { $regex: /airport/i }
    }).limit(5);
    console.log('Found', airportData.length, 'documents');
    airportData.forEach(doc => console.log({
      id: doc._id,
      area: doc.area,
      propertyType: doc.propertyType,
      rooms: doc.rooms,
      rent: doc.rent,
      createdAt: doc.createdAt
    }));
    
    // Check what areas actually exist
    console.log('\n2. Available areas (case-sensitive):');
    const areasInDb = await MarketSample.distinct('area');
    const airportLike = areasInDb.filter(a => a && a.toLowerCase().includes('airport'));
    console.log('Airport-like areas:', airportLike);
    
    // Check Appartment property type data
    console.log('\n3. Appartment type data:');
    const appartmentData = await MarketSample.find({ 
      propertyType: { $regex: /appartment/i }
    }).limit(3);
    console.log('Found', appartmentData.length, 'Appartment documents');
    appartmentData.forEach(doc => console.log({
      propertyType: doc.propertyType,
      area: doc.area,
      rooms: doc.rooms,
      rent: doc.rent
    }));
    
    // Check what property types exist
    console.log('\n4. Available property types:');
    const propertyTypes = await MarketSample.distinct('propertyType');
    console.log('Property types:', propertyTypes);
    
    // Check rooms=3 data
    console.log('\n5. Rooms=3 data:');
    const rooms3Data = await MarketSample.find({ rooms: 3 }).limit(3);
    console.log('Found', rooms3Data.length, 'rooms=3 documents');
    rooms3Data.forEach(doc => console.log({
      area: doc.area,
      propertyType: doc.propertyType,
      rooms: doc.rooms,
      rent: doc.rent
    }));
    
    // Test the exact aggregation pipeline
    console.log('\n6. Testing aggregation pipeline:');
    const testPipeline = [
      { $match: { 
        rent: { $gt: 0 },
        rooms: { $gte: 3, $lte: 3 },
        propertyType: { $in: ['Apartment', 'Flat', 'Family', 'Appartment'] }
      }},
      { $addFields: {
        _normArea: { $toLower: { $trim: { input: { $ifNull: ['$area', ''] } } } }
      }},
      { $match: { _normArea: { $in: ['airport'] } }},
      {
        $addFields: {
          period: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
        }
      },
      {
        $group: {
          _id: { period: '$period', area: '$area' },
          avgRent: { $avg: '$rent' },
          count: { $sum: 1 },
          rents: { $push: '$rent' }
        }
      }
    ];
    
    const result = await MarketSample.aggregate(testPipeline);
    console.log('Aggregation result:', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

debugTrendsData();
