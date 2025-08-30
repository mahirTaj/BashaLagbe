const express = require('express');
const router = express.Router();
const Listing = require('../models/listings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendNotification } = require('../utils/sendNotifications'); // ✅ Added for notifications

// --------------------------------------------------
// Helpers & upload config
// --------------------------------------------------
function getUserId(req) {
  return (req.headers['x-user-id'] || req.query.userId || '').toString();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Helpers to map a stored URL to a local uploads file path and delete safely
const uploadsDir = path.join(__dirname, '..', 'uploads');
function urlToUploadPath(url) {
  if (!url) return null;
  try {
    const u = new URL(url, 'http://localhost'); // base for relative urls
    const idx = u.pathname.indexOf('/uploads/');
    if (idx === -1) return null;
    const rel = decodeURIComponent(u.pathname.substring(idx + '/uploads/'.length));
    if (!rel || rel.includes('..') || path.isAbsolute(rel)) return null;
    return path.join(uploadsDir, rel);
  } catch {
    return null;
  }
}

async function unlinkSafe(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (e) {
    // ignore if already missing or access issues
  }
}

// --------------------------------------------------
// Create listing (requires userId)
// --------------------------------------------------
router.post('/', upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const base = `${req.protocol}://${req.get('host')}`;
    const photoUrls = (req.files?.photos || []).map((f) => `${base}/uploads/${f.filename}`);
    const videoUrl = req.files?.video?.[0] ? `${base}/uploads/${req.files.video[0].filename}` : '';

    // Basic required validations
    const missing = [];
    if (!req.body.title || !req.body.title.trim()) missing.push('title');
    if (req.body.price === undefined || req.body.price === '') missing.push('price');
    if (!req.body.type) missing.push('type');
    if (!req.body.division) missing.push('division');
    if (!req.body.district) missing.push('district');
    if (!req.body.subdistrict) missing.push('subdistrict');
    if (!req.body.area) missing.push('area');
    if (!req.body.phone || !req.body.phone.trim()) missing.push('phone');
    const floorNum = req.body.floor !== undefined ? Number(req.body.floor) : undefined;
    if (floorNum === undefined || Number.isNaN(floorNum) || floorNum < 0) missing.push('floor');
    if (!req.body.availableFrom) missing.push('availableFrom');
    const roomsNum = req.body.rooms !== undefined ? Number(req.body.rooms) : undefined;
    if (roomsNum === undefined || Number.isNaN(roomsNum) || roomsNum < 0) missing.push('rooms');
    if (photoUrls.length === 0) missing.push('photos');
    if (missing.length) return res.status(400).json({ error: 'Missing required fields', fields: missing });

    const payload = {
      ...req.body,
      userId,
      price: (() => { const n = Number(req.body.price); return Number.isFinite(n) && n > 0 ? n : 0; })(),
      rooms: Number(req.body.rooms),
      bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : 0,
      balcony: req.body.balcony ? Number(req.body.balcony) : 0,
      personCount: req.body.personCount ? Number(req.body.personCount) : 1,
      isRented: req.body.isRented === 'true' || req.body.isRented === true,
      features: req.body.features
        ? req.body.features.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      floor: Number(req.body.floor),
      totalFloors: req.body.totalFloors ? Number(req.body.totalFloors) : 0,
      furnishing: req.body.furnishing || 'Unfurnished',
      deposit: req.body.deposit ? Math.max(0, Number(req.body.deposit)) : 0,
      serviceCharge: req.body.serviceCharge ? Math.max(0, Number(req.body.serviceCharge)) : 0,
      negotiable: req.body.negotiable === 'true' || req.body.negotiable === true,
      utilitiesIncluded: req.body.utilitiesIncluded
        ? req.body.utilitiesIncluded.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      contactName: req.body.contactName || '',
      phone: req.body.phone || '',
      availableFrom: new Date(req.body.availableFrom),
      photoUrls,
      videoUrl,
      sizeSqft: req.body.sizeSqft ? Number(req.body.sizeSqft) : 0,
    };

    const listing = new Listing(payload);
    const saved = await listing.save();

    // ✅ Send notification after creation
    await sendNotification(
      userId,
      'listing_approval',
      'Listing Created',
      `Your listing "${saved.title}" was created successfully.`,
      `/listings/${saved._id}`
    );

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Basic get (optionally restricted to user via header) - kept for existing UI
// --------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const filter = userId ? { userId } : {};
    const listings = await Listing.find(filter).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Advanced search endpoint (public browse)
// --------------------------------------------------
router.get('/search', async (req, res) => {
  // ... all existing search logic remains unchanged ...
});

// --------------------------------------------------
// Get single listing
// --------------------------------------------------
router.get('/:id', async (req, res) => {
  // ... existing single listing logic unchanged ...
});

// --------------------------------------------------
// Update listing (only by owner)
// --------------------------------------------------
router.put('/:id', upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const doc = await Listing.findOne({ _id: req.params.id, userId });
    if (!doc) return res.status(404).json({ error: 'Not found or not owner' });

    const base = `${req.protocol}://${req.get('host')}`;
    const newPhotoUrls = (req.files?.photos || []).map((f) => `${base}/uploads/${f.filename}`);
    const keep = req.body.existingPhotoUrls ? JSON.parse(req.body.existingPhotoUrls) : doc.photoUrls;

    const originalPhotoUrls = Array.isArray(doc.photoUrls) ? [...doc.photoUrls] : [];
    const originalVideoUrl = doc.videoUrl || '';

    // ... all your existing field updates here unchanged ...

    const updated = await doc.save();

    // ✅ Send notification after update
    await sendNotification(
      userId,
      'rent_change',
      'Listing Updated',
      `Your listing "${updated.title}" was updated.`,
      `/listings/${updated._id}`
    );

    const removedPhotos = originalPhotoUrls.filter((u) => !doc.photoUrls.includes(u));
    const pathsToDelete = [
      ...removedPhotos.map(urlToUploadPath),
      urlToUploadPath(originalVideoUrl),
    ].filter(Boolean);
    Promise.all(pathsToDelete.map(unlinkSafe)).catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Delete listing (owner only)
// --------------------------------------------------
router.delete('/:id', async (req, res) => {
  // ... existing delete logic unchanged ...
});

module.exports = router;
