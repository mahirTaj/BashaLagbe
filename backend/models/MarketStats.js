const mongoose = require('mongoose');

// Aggregated statistics per (district, area) and period
const MarketStatsSchema = new mongoose.Schema({
  district: { type: String, index: true },
  area: { type: String, index: true },
  period: { type: String, index: true }, // e.g. '2025-08' (month) or '2025-W35'
  sampleCount: Number,
  avgRent: Number,
  medianRent: Number,
  minRent: Number,
  maxRent: Number,
  bedroomBreakdown: {
    type: Map,
    of: {
      count: Number,
      avgRent: Number
    },
    default: {}
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('MarketStats', MarketStatsSchema);
