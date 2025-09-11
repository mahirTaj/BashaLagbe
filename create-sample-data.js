require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('./backend/models/listings');
const User = require('./backend/models/User');

async function createSampleListings() {
  try {
    // Configure mongoose
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferTimeoutMS', 0);
    
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 10000,
      retryWrites: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Wait for connection to be fully ready
    let attempts = 0;
    while (mongoose.connection.readyState !== 1 && attempts < 10) {
      console.log(`⏳ Waiting for connection (attempt ${attempts + 1}/10)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (mongoose.connection.readyState !== 1) {
      throw new Error(`Connection not ready after ${attempts} attempts. State: ${mongoose.connection.readyState}`);
    }
    
    console.log('🔗 Connection fully ready');
    
    // Get the admin user using native driver
    const usersCollection = mongoose.connection.db.collection('users');
    const admin = await usersCollection.findOne({ email: 'admin@bashalagbe.com' });
    if (!admin) {
      console.error('❌ Admin user not found. Please create admin first.');
      return;
    }
    
    console.log('👤 Found admin user:', admin.email);
    
    // Sample listings data
    const sampleListings = [
      {
        title: 'Beautiful 2BR Apartment in Dhanmondi',
        description: 'A lovely 2-bedroom apartment with modern amenities in the heart of Dhanmondi.',
        type: 'Apartment',
        dealType: 'For Rent',
        price: 35000,
        area: 1200,
        bedrooms: 2,
        bathrooms: 2,
        location: {
          address: 'Road 15, Dhanmondi, Dhaka',
          district: 'Dhaka',
          area: 'Dhanmondi',
          coordinates: [90.3742, 23.7454]
        },
        amenities: ['Wi-Fi', 'Parking', 'Security', 'Generator'],
        owner: admin._id,
        status: 'available',
        contact: {
          phone: '+8801712345678',
          email: 'admin@bashalagbe.com'
        }
      },
      {
        title: 'Cozy Single Room for Student',
        description: 'Perfect single room for students near TSC.',
        type: 'Room',
        dealType: 'For Rent',
        price: 8000,
        area: 150,
        bedrooms: 1,
        bathrooms: 1,
        location: {
          address: 'Shahbag, Dhaka',
          district: 'Dhaka',
          area: 'Shahbag',
          coordinates: [90.3938, 23.7386]
        },
        amenities: ['Wi-Fi', 'Study Table'],
        owner: admin._id,
        status: 'available',
        contact: {
          phone: '+8801712345678',
          email: 'admin@bashalagbe.com'
        }
      },
      {
        title: 'Commercial Space for Office',
        description: 'Modern commercial space suitable for small office.',
        type: 'Commercial',
        dealType: 'For Rent',
        price: 50000,
        area: 800,
        bedrooms: 0,
        bathrooms: 2,
        location: {
          address: 'Motijheel, Dhaka',
          district: 'Dhaka',
          area: 'Motijheel',
          coordinates: [90.4203, 23.7334]
        },
        amenities: ['Elevator', 'Parking', 'Security'],
        owner: admin._id,
        status: 'available',
        contact: {
          phone: '+8801712345678',
          email: 'admin@bashalagbe.com'
        }
      },
      {
        title: '3BR Family Apartment in Gulshan',
        description: 'Spacious family apartment with all modern facilities.',
        type: 'Apartment',
        dealType: 'For Sale',
        price: 12000000,
        area: 1800,
        bedrooms: 3,
        bathrooms: 3,
        location: {
          address: 'Gulshan 2, Dhaka',
          district: 'Dhaka',
          area: 'Gulshan',
          coordinates: [90.4152, 23.7925]
        },
        amenities: ['Swimming Pool', 'Gym', 'Parking', 'Security', 'Generator'],
        owner: admin._id,
        status: 'available',
        contact: {
          phone: '+8801712345678',
          email: 'admin@bashalagbe.com'
        }
      },
      {
        title: 'Sublet Room Near University',
        description: 'Temporary sublet room available for 6 months.',
        type: 'Sublet',
        dealType: 'For Rent',
        price: 12000,
        area: 200,
        bedrooms: 1,
        bathrooms: 1,
        location: {
          address: 'Elephant Road, Dhaka',
          district: 'Dhaka',
          area: 'Elephant Road',
          coordinates: [90.3947, 23.7379]
        },
        amenities: ['Wi-Fi', 'Shared Kitchen'],
        owner: admin._id,
        status: 'available',
        contact: {
          phone: '+8801712345678',
          email: 'admin@bashalagbe.com'
        }
      }
    ];
    
    // Clear existing listings
    const listingsCollection = mongoose.connection.db.collection('listings');
    await listingsCollection.deleteMany({});
    console.log('🗑️ Cleared existing listings');
    
    // Insert sample listings using native driver
    const created = await listingsCollection.insertMany(sampleListings);
    console.log(`✅ Created ${created.insertedCount} sample listings`);
    
    // Show summary
    const total = await listingsCollection.countDocuments();
    console.log(`📊 Total listings in database: ${total}`);
    
  } catch (error) {
    console.error('❌ Error creating sample listings:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Connection closed');
  }
}

createSampleListings();
