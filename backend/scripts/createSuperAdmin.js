// One-off script to create or update a Super Admin user
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO = process.env.MONGO_URI || 'mongodb+srv://mahir19800:q1w2e3r4t5@cluster0.17romrq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  const email = process.env.SUPERADMIN_EMAIL || process.argv[2] || 'admin@example.com';
  const password = process.env.SUPERADMIN_PASSWORD || process.argv[3] || 'ChangeMe123!';

  if (!email || !password) {
    console.error('Usage: node scripts/createSuperAdmin.js <email> <password>');
    process.exit(1);
  }

  await mongoose.connect(MONGO);
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { email },
      { name: 'Super Admin', email, passwordHash: hash, role: 'admin' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Super admin ready:', { id: user._id.toString(), email: user.email, role: user.role });
  } catch (err) {
    console.error('Failed to create super admin:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
