const mongoose = require('mongoose');

// Raw scraped rental sample NOT treated as a platform listing
const MarketSampleSchema = new mongoose.Schema({
  title: String,
  propertyType: String,
  area: { type: String, index: true },
  district: { type: String, index: true },
  location: String,
  rent: { type: Number, index: true },
  rentCategory: String,
  bedrooms: Number,
  rooms: Number,
  bathrooms: Number,
  seats: Number, // from CSV 'seats'
  rentPerRoom: Number, // from CSV 'rent_per_room'
  availableFrom: String, // keep as scraped string
  url: String,
  sourceFile: String,
  scrapedAt: String,
  raw: { type: Object },
  // store raw original record for reference (optional future use)
  // raw: { type: Object }
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('MarketSample', MarketSampleSchema);
