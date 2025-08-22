require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'superadmin@admin.com';
    const password = 'SuperSecure123';

    const exists = await User.findOne({ email });
    if (exists) {
      console.log('Superadmin already exists:', email);
      process.exit(0);
    }

    await User.create({
      name: 'Super Admin',
      email,
      password, // hashed by pre-save
      role: 'superadmin'
    });

    console.log('Superadmin created');
    console.log('Email:', email);
    console.log('Password:', password);
    process.exit(0);
  } catch (e) {
    console.error('Seed error:', e.message);
    process.exit(1);
  }
})();