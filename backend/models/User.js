const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },        // For email/password users
  googleId: { type: String },        // For Google OAuth users
  contact: { type: String },
  preferences: { type: String },
  profilePic: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
