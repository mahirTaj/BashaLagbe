const mongoose = require('mongoose');
require('dotenv').config();

async function testPipeline() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const MarketSample = require('./models/MarketSample');
    
    // Test date window
    const since = new Date();
    since.setMonth(since.getMonth() - 18); // 18 months back
    console.log('Date window since:', since);
    
    // First check what data exists in the time window
    console.log('\n=== DATA IN TIME WINDOW ===');
    const recentData = await MarketSample.find({ 
      area: 'Airport',
      createdAt: { $gte: since },
      rent: { $gt: 0 },
      rooms: 3,
      propertyType: { $in: ['Apartment', 'Flat', 'Family', 'Appartment'] }
    });
    console.log('Recent data count:', recentData.length);
    recentData.forEach(doc => console.log({
      area: doc.area,
      rent: doc.rent,
      rooms: doc.rooms,
      propertyType: doc.propertyType,
      createdAt: doc.createdAt
    }));
    
    console.log('\n=== TESTING EXACT PIPELINE WITH TIME WINDOW ===');
    const pipelineWithTime = [
      { $match: { 
        rent: { $gt: 0 },
        rooms: { $gte: 3, $lte: 3 },
        propertyType: { $in: ['Apartment', 'Flat', 'Family', 'Appartment'] },
        createdAt: { $gte: since }
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
          location: {
            $cond: {
              if: { $and: [ { $ne: ['$_id.area', null] }, { $ne: ['$_id.area', ''] } ] },
              then: '$_id.area',
              else: '$_id.district'
            }
          },
          avgRent: { $round: ['$avgRent', 0] },
          count: 1,
          source: 'scraped',
          _id: 0
        }
      }
    ];
    
    const resultWithTime = await MarketSample.aggregate(pipelineWithTime);
    console.log('Pipeline result WITH time window:', JSON.stringify(resultWithTime, null, 2));
    
    console.log('\n=== TESTING PIPELINE WITHOUT TIME WINDOW ===');
    const pipelineNoTime = [
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
          location: {
            $cond: {
              if: { $and: [ { $ne: ['$_id.area', null] }, { $ne: ['$_id.area', ''] } ] },
              then: '$_id.area',
              else: '$_id.district'
            }
          },
          avgRent: { $round: ['$avgRent', 0] },
          count: 1,
          source: 'scraped',
          _id: 0
        }
      }
    ];
    
    const resultNoTime = await MarketSample.aggregate(pipelineNoTime);
    console.log('Pipeline result WITHOUT time window:', JSON.stringify(resultNoTime, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testPipeline();
