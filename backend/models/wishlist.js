const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listings: [
    {
      listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
      folder: { type: String, default: 'Default' },
      addedAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('Wishlist', wishlistSchema);