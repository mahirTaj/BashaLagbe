// Direct database check
require('dotenv').config();
const mongoose = require('mongoose');

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const listings = await db.collection('listings').find({}).sort({createdAt: -1}).limit(5).toArray();
    
    console.log('\nRecent 5 listings:');
    listings.forEach((listing, i) => {
      console.log(`\n${i+1}. ${listing.title || 'Untitled'}`);
      console.log('   Created:', listing.createdAt);
      console.log('   PhotoUrls:', listing.photoUrls || []);
      console.log('   VideoUrl:', listing.videoUrl || 'none');
      
      if (listing.photoUrls && listing.photoUrls.length > 0) {
        const firstPhoto = listing.photoUrls[0];
        console.log('   Photo type:', firstPhoto.includes('cloudinary.com') ? 'Cloudinary' : 
                   firstPhoto.includes('/uploads/') ? 'Local' : 'Unknown');
      }
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDB();
