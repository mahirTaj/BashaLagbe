require('dotenv').config();
const mongoose = require('mongoose');
const MarketSample = require('./models/MarketSample');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');
    
    const count = await MarketSample.countDocuments();
    console.log('Total MarketSamples:', count);
    
    if (count > 0) {
      const samples = await MarketSample.find().limit(5);
      console.log('\nSample data:');
      samples.forEach((s, i) => {
        console.log(`${i+1}. ${s.area || 'No area'}, ${s.district || 'No district'}: ৳${s.rent || 0} (${s.propertyType || 'No type'})`);
      });
      
      // Check areas and districts
      const areas = await MarketSample.distinct('area');
      const districts = await MarketSample.distinct('district');
      console.log('\nAvailable areas:', areas.slice(0, 10));
      console.log('Available districts:', districts.slice(0, 10));
    } else {
      console.log('No MarketSample data found. Creating sample data...');
      await createSampleData();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function createSampleData() {
  const sampleData = [
    { area: 'Dhanmondi', district: 'Dhaka', rent: 25000, propertyType: 'Apartment', bedrooms: 2, rooms: 3 },
    { area: 'Gulshan', district: 'Dhaka', rent: 45000, propertyType: 'Apartment', bedrooms: 3, rooms: 4 },
    { area: 'Banani', district: 'Dhaka', rent: 40000, propertyType: 'Apartment', bedrooms: 3, rooms: 4 },
    { area: 'Uttara', district: 'Dhaka', rent: 20000, propertyType: 'Apartment', bedrooms: 2, rooms: 3 },
    { area: 'Mirpur', district: 'Dhaka', rent: 15000, propertyType: 'Room', bedrooms: 1, rooms: 1 },
    { area: 'Bashundhara', district: 'Dhaka', rent: 35000, propertyType: 'Apartment', bedrooms: 3, rooms: 4 },
    { area: 'Wari', district: 'Dhaka', rent: 18000, propertyType: 'Room', bedrooms: 1, rooms: 2 },
    { area: 'Elephant Road', district: 'Dhaka', rent: 22000, propertyType: 'Apartment', bedrooms: 2, rooms: 3 },
    { area: 'New Market', district: 'Dhaka', rent: 20000, propertyType: 'Room', bedrooms: 1, rooms: 2 },
    { area: 'Mohammadpur', district: 'Dhaka', rent: 16000, propertyType: 'Apartment', bedrooms: 2, rooms: 3 }
  ];
  
  for (const data of sampleData) {
    await MarketSample.create({
      ...data,
      title: `${data.propertyType} in ${data.area}`,
      location: `${data.area}, ${data.district}`,
      areaSqft: Math.floor(Math.random() * 500) + 500,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
    });
  }
  
  console.log('Created 10 sample MarketSample records');
}

checkData();
