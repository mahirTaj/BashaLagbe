import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Report } from '../models/Report.js';
import mongoose from 'mongoose';
import { ROLES } from '../utils/roles.js';

const seed = async () => {
  try {
    await connectDB();

    // Super Admin: Fardin
    let superAdmin = await User.findOne({ email: env.seedAdminEmail });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Fardin',
        email: env.seedAdminEmail,
        password: env.seedAdminPassword,
        role: ROLES.SUPER_ADMIN
      });
      console.log('Super admin created:', superAdmin.email);
    } else {
      console.log('Super admin exists:', superAdmin.email);
    }

    // Optional demo data
    const demoUser = await User.findOneAndUpdate(
      { email: 'user1@example.com' },
      { name: 'Latifa Tenant', email: 'user1@example.com', password: 'User@12345', role: ROLES.USER },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Pending listings
    const existing = await Listing.countDocuments();
    if (existing === 0) {
      const l1 = await Listing.create({
        title: 'Sunny 2BHK in Dhanmondi',
        description: 'Close to Dhanmondi Lake, 900 sq ft.',
        address: 'Road 27, Dhanmondi, Dhaka',
        price: 35000,
        images: [],
        createdBy: demoUser._id
      });
      const l2 = await Listing.create({
        title: 'Cozy Room in Mirpur',
        description: 'Shared flat, students welcome.',
        address: 'Mirpur 10, Dhaka',
        price: 8000,
        images: [],
        createdBy: demoUser._id
      });
      await Report.create({
        listing: l2._id,
        reporter: demoUser._id,
        reason: 'Suspicious duplicate post'
      });
      console.log('Seeded listings and report');
    }

    console.log('Seeding complete');
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seed();