const mongoose = require('mongoose');
const Listing = require('./models/listings');
require('dotenv').config();

const migrateToCloudinary = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected.');

    console.log('Finding listings with local URLs...');
    const listingsToUpdate = await Listing.find({
      $or: [
        { 'photoUrls': { $elemMatch: { $regex: /^\/uploads\// } } },
        { 'photoUrls': { $elemMatch: { $regex: /^http:\/\/localhost:5000\/uploads\// } } },
        { 'videoUrl': { $regex: /^\/uploads\// } },
        { 'videoUrl': { $regex: /^http:\/\/localhost:5000\/uploads\// } }
      ]
    });

    if (listingsToUpdate.length === 0) {
      console.log('No listings with local URLs found. Migration not needed.');
      mongoose.disconnect();
      return;
    }

    console.log(`Found ${listingsToUpdate.length} listings to migrate.`);

    // This is a placeholder for the actual Cloudinary upload logic.
    // In a real script, you would use the Cloudinary SDK to upload each local file.
    const uploadToCloudinary = async (localUrl) => {
      // This is a mock function. Replace with actual Cloudinary upload.
      // For example:
      // const result = await cloudinary.uploader.upload(localFilePath);
      // return result.secure_url;
      const filename = localUrl.split('/').pop();
      // This is a fake URL for demonstration.
      return `https://res.cloudinary.com/dhphu8mdl/image/upload/v1620000000/basha-lagbe/photos/${filename}`;
    };

    for (const listing of listingsToUpdate) {
      let updated = false;

      const newPhotoUrls = await Promise.all(
        listing.photoUrls.map(async (url) => {
          if (url.includes('/uploads/')) {
            updated = true;
            // In a real migration, you'd download the file from the local URL
            // or find it on disk, then upload to Cloudinary.
            // For this script, we'll just simulate the URL change.
            console.log(`  Migrating photo: ${url}`);
            return uploadToCloudinary(url);
          }
          return url;
        })
      );

      if (listing.videoUrl && listing.videoUrl.includes('/uploads/')) {
        updated = true;
        console.log(`  Migrating video: ${listing.videoUrl}`);
        listing.videoUrl = await uploadToCloudinary(listing.videoUrl);
      }

      listing.photoUrls = newPhotoUrls;

      if (updated) {
        console.log(`Updating listing: ${listing.title}`);
        await listing.save();
      }
    }

    console.log('Migration script finished.');
    mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    mongoose.disconnect();
  }
};

// To run this script: node migrateToCloudinary.js
// Note: This is a dry-run safe version as `uploadToCloudinary` is a mock.
// To make it real, you would need to implement the file upload logic.
// migrateToCloudinary();
console.log("This is a migration script. To run it, uncomment the call to migrateToCloudinary() at the end of the file.");
