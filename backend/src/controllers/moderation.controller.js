const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Report = require('../models/Report');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// internal helper
async function logModAction({ action, actor, targetType, targetId, meta = {} }) {
  try {
    await AuditLog.create({ action, actor, targetType, targetId, meta });
  } catch (_) {}
}

// Pending listings
exports.getPendingListings = async (req, res) => {
  const items = await Listing.find({ status: 'pending' })
    .populate('owner', 'name email role isBlocked')
    .sort({ createdAt: -1 });
  res.json({ items });
};

exports.approveListing = async (req, res) => {
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    { status: 'published', verifiedBy: req.user._id, verifiedAt: new Date(), rejectReason: null },
    { new: true }
  ).populate('owner', 'name email');
  if (!listing) return res.status(404).json({ message: 'Listing not found' });

  await logModAction({
    action: 'LISTING_APPROVED',
    actor: req.user._id,
    targetType: 'Listing',
    targetId: listing._id.toString()
  });

  res.json({ listing });
};

exports.rejectListing = async (req, res) => {
  const { reason = 'Not specified' } = req.body;
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', rejectReason: reason, verifiedBy: req.user._id, verifiedAt: new Date() },
    { new: true }
  ).populate('owner', 'name email');
  if (!listing) return res.status(404).json({ message: 'Listing not found' });

  await logModAction({
    action: 'LISTING_REJECTED',
    actor: req.user._id,
    targetType: 'Listing',
    targetId: listing._id.toString(),
    meta: { reason }
  });

  res.json({ listing });
};

// Reports
exports.getOpenReports = async (req, res) => {
  const items = await Report.find({ status: 'open' })
    .populate('listing', 'title status owner')
    .populate('reporter', 'name email')
    .sort({ createdAt: -1 });
  res.json({ items });
};

exports.resolveReport = async (req, res) => {
  const { action = 'none' } = req.body; // 'none' | 'unpublish' | 'blockOwner'
  const report = await Report.findById(req.params.id).populate('listing');
  if (!report) return res.status(404).json({ message: 'Report not found' });

  if (action === 'unpublish' && report.listing) {
    await Listing.findByIdAndUpdate(report.listing._id, { status: 'rejected', rejectReason: 'Moderation: reported' });
  }
  if (action === 'blockOwner' && report.listing) {
    await User.findByIdAndUpdate(report.listing.owner, { isBlocked: true });
  }

  report.status = 'resolved';
  report.resolvedBy = req.user._id;
  report.resolvedAt = new Date();
  await report.save();

  await logModAction({
    action: 'REPORT_RESOLVED',
    actor: req.user._id,
    targetType: 'Report',
    targetId: report._id.toString(),
    meta: { action }
  });

  res.json({ report });
};

// User block toggle
exports.blockUser = async (req, res) => {
  const { block } = req.body;
  const user = await User.findByIdAndUpdate(req.params.userId, { isBlocked: !!block }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  await logModAction({
    action: block ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
    actor: req.user._id,
    targetType: 'User',
    targetId: user._id.toString()
  });

  res.json({ user });
};

// Stats
exports.getStats = async (req, res) => {
  const [
    totalUsers,
    blockedUsers,
    pendingListings,
    publishedListings,
    rejectedListings,
    openReports,
    resolvedReports
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isBlocked: true }),
    Listing.countDocuments({ status: 'pending' }),
    Listing.countDocuments({ status: 'published' }),
    Listing.countDocuments({ status: 'rejected' }),
    Report.countDocuments({ status: 'open' }),
    Report.countDocuments({ status: 'resolved' })
  ]);
  res.json({
    totalUsers,
    blockedUsers,
    pendingListings,
    publishedListings,
    rejectedListings,
    openReports,
    resolvedReports
  });
};

// Admin users list
exports.adminListUsers = async (req, res) => {
  const { page = 1, limit = 10, search = '', role, blocked } = req.query;
  const q = {};
  if (search) q.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  if (role) q.role = role;
  if (blocked === 'true') q.isBlocked = true;
  if (blocked === 'false') q.isBlocked = false;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(q).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(q)
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
};

// Change user role
exports.changeUserRole = async (req, res) => {
  const { role } = req.body; // 'user' | 'admin' | 'superadmin'
  if (!['user', 'admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  await logModAction({
    action: 'USER_ROLE_CHANGED',
    actor: req.user._id,
    targetType: 'User',
    targetId: user._id.toString(),
    meta: { role }
  });

  res.json({ user });
};

// Audit logs
exports.getAuditLogs = async (req, res) => {
  const { page = 1, limit = 20, action, actor } = req.query;
  const q = {};
  if (action) q.action = action;
  if (actor) q.actor = actor;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    AuditLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('actor', 'name email role'),
    AuditLog.countDocuments(q)
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
};

// Bulk moderation
exports.bulkApproveListings = async (req, res) => {
  const { ids = [] } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });

  const result = await Listing.updateMany(
    { _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } },
    { $set: { status: 'published', verifiedBy: req.user._id, verifiedAt: new Date(), rejectReason: null } }
  );

  for (const id of ids) {
    logModAction({ action: 'LISTING_APPROVED', actor: req.user._id, targetType: 'Listing', targetId: String(id) });
  }
  res.json({ updated: result.modifiedCount });
};

exports.bulkRejectListings = async (req, res) => {
  const { ids = [], reason = 'Not specified' } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });

  const result = await Listing.updateMany(
    { _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } },
    { $set: { status: 'rejected', rejectReason: reason, verifiedBy: req.user._id, verifiedAt: new Date() } }
  );

  for (const id of ids) {
    logModAction({
      action: 'LISTING_REJECTED',
      actor: req.user._id,
      targetType: 'Listing',
      targetId: String(id),
      meta: { reason }
    });
  }
  res.json({ updated: result.modifiedCount });
};

// System health
exports.getHealth = async (req, res) => {
  const mongoState = (require('mongoose').connection.readyState === 1) ? 'connected' : 'disconnected';
  res.json({
    uptimeSeconds: Math.round(process.uptime()),
    node: process.version,
    mongo: mongoState,
    time: new Date().toISOString()
  });
};