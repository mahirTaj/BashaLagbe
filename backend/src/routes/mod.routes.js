const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const {
  // core moderation
  getPendingListings,
  approveListing,
  rejectListing,
  getOpenReports,
  resolveReport,
  blockUser,
  // additions
  getStats,
  adminListUsers,
  changeUserRole,
  getAuditLogs,
  bulkApproveListings,
  bulkRejectListings,
  getHealth
} = require('../controllers/moderation.controller');

// Guard all moderation routes
router.use(auth, requireRole('admin', 'superadmin'));

// Listings moderation
router.get('/listings/pending', getPendingListings);
router.post('/listings/:id/approve', approveListing);
router.post('/listings/:id/reject', rejectListing);

// Reports
router.get('/reports', getOpenReports);
router.post('/reports/:id/resolve', resolveReport);

// Users
router.post('/users/:userId/block', blockUser);
router.get('/users', adminListUsers);
router.patch('/users/:userId/role', changeUserRole);

// Stats & logs
router.get('/stats', getStats);
router.get('/logs', getAuditLogs);

// Bulk moderation
router.post('/listings/bulk-approve', bulkApproveListings);
router.post('/listings/bulk-reject', bulkRejectListings);

// System health
router.get('/health', getHealth);

module.exports = router;