require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('Using URI:', process.env.MONGO_URI ? 'URI configured' : 'URI missing');
    
    // Disable buffering completely
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferTimeoutMS', 0); // Disable buffering entirely
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 10000,
      retryWrites: true,
    });
    
    console.log('✅ Initial connection established');
    console.log('Connection state:', mongoose.connection.readyState);
    
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
    
    console.log('✅ Connection fully ready');
    
    // Test basic database operations
    console.log('🔍 Testing database operations...');
    
    // List all collections first
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Check listings collection
    const listingsCollection = mongoose.connection.db.collection('listings');
    const listingsCount = await listingsCollection.countDocuments();
    console.log(`Found ${listingsCount} listings in database`);
    
    if (listingsCount > 0) {
      const sampleListing = await listingsCollection.findOne();
      console.log('Sample listing:', sampleListing);
    }
    
    // Check users collection  
    const usersCollection = mongoose.connection.db.collection('users');
    const usersCount = await usersCollection.countDocuments();
    console.log(`Found ${usersCount} users in database`);
    
    if (usersCount > 0) {
      const sampleUser = await usersCollection.findOne();
      console.log('Sample user:', {
        id: sampleUser._id,
        name: sampleUser.name,
        email: sampleUser.email,
        role: sampleUser.role
      });
    }
    
  } catch (err) {
    console.error('❌ Database operation failed:', err.message);
    console.error('Connection state:', mongoose.connection.readyState);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✅ Connection closed');
    }
  }
}

// Run the check
checkDatabase();
