const mongoose = require('mongoose');

// Extended Listing schema to support user-specific CRUD and richer fields
const ListingSchema = new mongoose.Schema(
  {
    // Required: associate listing to a user (dummy users for now)
    userId: { type: String, required: true, index: true },

    // Basic info
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['Apartment', 'Room', 'Sublet', 'Commercial', 'Hostel'],
      required: true,
    },

    // Location & pricing
  // Structured address
  division: { type: String, required: true, default: '' },
  district: { type: String, required: true, default: '' },
  subdistrict: { type: String, required: true, default: '' },
  area: { type: String, required: true, default: '' },
  road: { type: String, default: '' },
  houseNo: { type: String, default: '' },
  price: { type: Number, default: 0, min: 0 },
    availableFrom: { type: Date, required: true },

    // Property details
  rooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, default: 0 },
    balcony: { type: Number, default: 0 },
    personCount: { type: Number, default: 1 },
    features: { type: [String], default: [] },
  floor: { type: Number, required: true, min: 0 },
  totalFloors: { type: Number, default: 0 },
  furnishing: { type: String, enum: ['Unfurnished', 'Semi-furnished', 'Furnished'], default: 'Unfurnished' },
  sizeSqft: { type: Number, default: 0 },
  propertyType: { type: String, enum: ['For Rent', 'For Sale'], default: 'For Rent' },
  
    // Geo (optional lat/lng and GeoJSON point for map)
    lat: { type: Number },
    lng: { type: Number },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }, // [lng, lat]
    },

    // Media (store URLs for now; file uploads can map to URLs later)
    photoUrls: { type: [String], default: [] },
    videoUrl: { type: String, default: '' },

    // Status
    isRented: { type: Boolean, default: false },

  // Extended pricing & utilities
  deposit: { type: Number, default: 0, min: 0 },
  serviceCharge: { type: Number, default: 0, min: 0 },
  negotiable: { type: Boolean, default: false },
  utilitiesIncluded: { type: [String], default: [] },

  // Contact
  contactName: { type: String, default: '' },
  phone: { type: String, required: true, default: '' },
  },
  { timestamps: true }
);

// Text index for keyword search (regex still used for flexible partials; index helps future $text queries)
try {
  ListingSchema.index({
    title: 'text',
    description: 'text',
    area: 'text',
    propertyType: 'text',
    subdistrict: 'text',
    district: 'text',
    division: 'text',
  });
} catch (e) {
  // index may already exist; ignore runtime errors during hot reload
}

// 2dsphere index for geospatial queries on map
try {
  ListingSchema.index({ location: '2dsphere' });
} catch (e) {
  // ignore if duplicate during dev
}

module.exports = mongoose.model('Listing', ListingSchema);
