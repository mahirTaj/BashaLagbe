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

module.exports = mongoose.model('Listing', ListingSchema);
