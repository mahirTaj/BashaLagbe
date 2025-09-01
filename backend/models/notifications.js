// backend/models/notifications.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.Mixed,  // ✅ Accepts ObjectId or String (demo users like "user_a")
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      'message', 
      'listing_approval', 
      'rent_change', 
      'listing_created', 
      'listing_updated'
    ], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, 
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
