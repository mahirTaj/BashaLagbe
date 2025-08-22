import { Router } from 'express';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import { Listing } from '../models/Listing.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { AdminAction } from '../models/AdminAction.js';

const router = Router();

// All routes below require admin
router.use(requireAuth, requireAdmin);

// GET /api/admin/overview
router.get('/overview', async (req, res) => {
  const [pendingListings, openReports, activeUsers, blockedUsers] = await Promise.all([
    Listing.countDocuments({ status: 'PENDING' }),
    Report.countDocuments({ status: 'OPEN' }),
    User.countDocuments({ status: 'ACTIVE' }),
    User.countDocuments({ status: 'BLOCKED' })
  ]);
  res.json({ pendingListings, openReports, activeUsers, blockedUsers });
});

// GET /api/admin/listings/pending
router.get('/listings/pending', async (req, res) => {
  const docs = await Listing.find({ status: 'PENDING' })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');
  res.json(docs);
});

// PATCH /api/admin/listings/:id/verify
router.patch('/listings/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { decision, note } = req.body; // decision: 'APPROVE' | 'REJECT'
  const listing = await Listing.findById(id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  if (listing.status !== 'PENDING') return res.status(400).json({ message: 'Listing is not pending' });

  if (decision === 'APPROVE') {
    listing.status = 'PUBLISHED';
  } else if (decision === 'REJECT') {
    listing.status = 'REJECTED';
  } else {
    return res.status(400).json({ message: 'Invalid decision' });
  }
  listing.verifiedBy = req.user.id;
  listing.verifiedAt = new Date();
  await listing.save();

  await AdminAction.create({
    actor: req.user.id,
    actionType: decision === 'APPROVE' ? 'VERIFY_LISTING' : 'REJECT_LISTING',
    targetType: 'LISTING',
    targetId: listing._id.toString(),
    meta: { note }
  });

  res.json({ message: 'Listing updated', listing });
});

// GET /api/admin/reports?status=OPEN|RESOLVED
router.get('/reports', async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .populate('listing', 'title status')
    .populate('reporter', 'name email');
  res.json(reports);
});

// PATCH /api/admin/reports/:id/resolve
router.patch('/reports/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const report = await Report.findById(id);
  if (!report) return res.status(404).json({ message: 'Report not found' });
  if (report.status === 'RESOLVED') return res.status(400).json({ message: 'Already resolved' });

  report.status = 'RESOLVED';
  report.resolvedBy = req.user.id;
  report.resolvedAt = new Date();
  if (notes) report.notes = notes;
  await report.save();

  await AdminAction.create({
    actor: req.user.id,
    actionType: 'RESOLVE_REPORT',
    targetType: 'REPORT',
    targetId: report._id.toString(),
    meta: { notes }
  });

  res.json({ message: 'Report resolved', report });
});

// GET /api/admin/users?role=USER|ADMIN|SUPER_ADMIN&status=ACTIVE|BLOCKED&search=...
router.get('/users', async (req, res) => {
  const { role, status, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).select('-password');
  res.json(users);
});

// PATCH /api/admin/users/:id/block   (super admin only)
router.patch('/users/:id/block', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ message: 'Cannot block yourself' });
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.status = 'BLOCKED';
  await user.save();

  await AdminAction.create({
    actor: req.user.id,
    actionType: 'BLOCK_USER',
    targetType: 'USER',
    targetId: user._id.toString()
  });

  res.json({ message: 'User blocked', user: { id: user._id, status: user.status } });
});

// PATCH /api/admin/users/:id/unblock  (super admin only)
router.patch('/users/:id/unblock', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.status = 'ACTIVE';
  await user.save();

  await AdminAction.create({
    actor: req.user.id,
    actionType: 'UNBLOCK_USER',
    targetType: 'USER',
    targetId: user._id.toString()
  });

  res.json({ message: 'User unblocked', user: { id: user._id, status: user.status } });
});

// GET /api/admin/audit?page=1&limit=20
router.get('/audit', async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AdminAction.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name email role'),
    AdminAction.countDocuments()
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

export default router;