require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Report = require('../models/Report');

(async function seedDemo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // --- 1. Create or update demo core users ---
    const [owner, reporter] = await Promise.all([
      User.findOneAndUpdate(
        { email: 'owner@example.com' },
        { name: 'Owner User', email: 'owner@example.com', password: 'OwnerPass123', role: 'user', isBlocked: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ),
      User.findOneAndUpdate(
        { email: 'reporter@example.com' },
        { name: 'Reporter User', email: 'reporter@example.com', password: 'ReporterPass123', role: 'user', isBlocked: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    ]);

    // --- 2. Add extra demo users: admins, blocked, active ---
    const demoUsers = [];

    // 3 active users
    for (let i = 1; i <= 3; i++) {
      demoUsers.push({
        name: `Demo Active User ${i}`,
        email: `demo_active_${i}@example.com`,
        password: `Password${i}`,
        role: 'user',
        isBlocked: false
      });
    }

    // 2 blocked users
    for (let i = 1; i <= 2; i++) {
      demoUsers.push({
        name: `Demo Blocked User ${i}`,
        email: `demo_blocked_${i}@example.com`,
        password: `Password${i}`,
        role: 'user',
        isBlocked: true
      });
    }

    // 2 active admins
    for (let i = 1; i <= 2; i++) {
      demoUsers.push({
        name: `Demo Admin ${i}`,
        email: `demo_admin_${i}@example.com`,
        password: `Password${i}`,
        role: 'admin',
        isBlocked: false
      });
    }

    // Bulk insert, ignoring duplicates
    for (const u of demoUsers) {
      await User.findOneAndUpdate(
        { email: u.email },
        u,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`👥 Demo users created/updated: ${demoUsers.length + 2} (including owner & reporter)`);

    // --- 3. Clear previous demo listings/reports ---
    await Listing.deleteMany({ title: /Demo Listing/i });
    await Report.deleteMany({ reason: /Demo Report/i });

    const listings = [];

    // Dhaka area context (used for titles/descriptions only)
    const dhakaAreas = [
      'Gulshan 1',
      'Banani',
      'Dhanmondi 27',
      'Mirpur 10',
      'Uttara Sector 4',
      'Mohammadpur',
      'Bashundhara R/A',
      'Banasree',
      'Tejgaon',
      'Khilgaon',
      'Mohakhali DOHS',
      'Malibagh',
      'Wari',
      'Lalbagh (Old Dhaka)',
      'Agargaon',
      'Shyamoli',
      'Kallyanpur',
      'Rampura',
      'Jatrabari',
      'Badda'
    ];

    const landmarks = [
      'Gulshan DCC Market',
      'Banani Lake',
      'Dhanmondi Lake',
      'Mirpur 10 Bus Stand',
      'Uttara North Tower',
      'Asad Gate',
      'Jamuna Future Park',
      'Meradia Bazar',
      'Farmgate',
      'Taltola',
      'DOHS Park',
      'Chowdhury Para',
      'Wari Police Station',
      'Chawk Bazar',
      'National Parliament (Sangsad Bhaban)',
      'Shishu Mela',
      'Kallyanpur Bus Stop',
      'Hatirjheel Rampura',
      'Jatrabari Crossing',
      'Notun Bazar'
    ];

    const bhk = (n) => (n % 3 === 1 ? '2BHK' : n % 3 === 2 ? '3BHK' : '1BHK');
    const size = (n) => (n % 3 === 1 ? '950 sqft' : n % 3 === 2 ? '1300 sqft' : '600 sqft');
    const rent = (n) => (n % 3 === 1 ? 45000 : n % 3 === 2 ? 70000 : 20000);

    // 10 pending listings
    for (let i = 1; i <= 10; i++) {
      const area = dhakaAreas[(i - 1) % dhakaAreas.length];
      const nearby = landmarks[(i - 1) % landmarks.length];
      const listing = await Listing.create({
        title: `Demo Listing Pending #${i} — ${area}, Dhaka`,
        description: `Pending Dhaka flat in ${area}. Layout: ${bhk(i)}, approx ${size(i)}. Typical rent: BDT ${rent(i)}/mo. Near ${nearby}. Pending for moderation testing (#${i}).`,
        owner: owner._id,
        status: 'pending'
      });
      listings.push(listing);
    }

    // 5 published listings
    for (let i = 1; i <= 5; i++) {
      const area = dhakaAreas[(i + 9) % dhakaAreas.length];
      const nearby = landmarks[(i + 9) % landmarks.length];
      const listing = await Listing.create({
        title: `Demo Listing Published #${i} — ${area}, Dhaka`,
        description: `Published Dhaka flat in ${area}. Layout: ${bhk(i)}, approx ${size(i)}. Typical rent: BDT ${rent(i)}/mo. Near ${nearby}. Published to populate stats (#${i}).`,
        owner: owner._id,
        status: 'published',
        verifiedBy: owner._id,
        verifiedAt: new Date()
      });
      listings.push(listing);
    }

    // 5 rejected listings
    for (let i = 1; i <= 5; i++) {
      const area = dhakaAreas[(i + 14) % dhakaAreas.length];
      const nearby = landmarks[(i + 14) % landmarks.length];
      const listing = await Listing.create({
        title: `Demo Listing Rejected #${i} — ${area}, Dhaka`,
        description: `Rejected Dhaka flat in ${area}. Layout: ${bhk(i)}, approx ${size(i)}. Typical rent: BDT ${rent(i)}/mo. Near ${nearby}. Rejected with reason.`,
        owner: owner._id,
        status: 'rejected',
        rejectReason: 'Not meeting guidelines',
        verifiedBy: owner._id,
        verifiedAt: new Date()
      });
      listings.push(listing);
    }

    console.log(`📝 Listings created: ${listings.length}`);

    // --- 4. Add reports to 5 of the pending listings ---
    for (let i = 0; i < 5; i++) {
      await Report.create({
        listing: listings[i]._id,
        reporter: reporter._id,
        reason: `Demo Report Reason #${i + 1}`,
        details: `Demo report for ${listings[i].title}.`
      });
    }
    console.log(`🚨 Reports created: 5 open`);

    console.log('🎉 Full demo data seeding complete.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Seed demo error:', e.message);
    process.exit(1);
  }
})();