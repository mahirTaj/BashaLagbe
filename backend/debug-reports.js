const mongoose = require('mongoose');
require('dotenv').config();

async function debugReports() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const Report = require('./models/Report');
    const User = require('./models/User');
    
    console.log('\n=== REPORTS DEBUG ===');
    const reports = await Report.find().limit(10);
    console.log('Sample reports:');
    reports.forEach(r => console.log({ 
      id: r._id, 
      reporterId: r.reporterId, 
      type: r.reportType, 
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt
    }));
    
    console.log('\n=== USERS DEBUG ===');
    const users = await User.find().limit(5);
    console.log('Sample users:');
    users.forEach(u => console.log({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role
    }));
    
    console.log('\n=== REPORTS COUNT BY REPORTER ===');
    const reportsByUser = await Report.aggregate([
      { $group: { _id: '$reporterId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Reports by reporterId:', reportsByUser);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

debugReports();
