const express = require('express');
const router = express.Router();
const Listing = require('../models/listings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const auth = require('../middleware/auth');

// NOTE: For management endpoints we require JWT auth and use req.user.id as the canonical owner id.
// The previous getUserId helper allowed a dev 'x-user-id' header; we intentionally require auth for
// create/update/delete and listing management to prevent exposing all listings to any caller.

// Multer storage for uploads
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
router.post('/', auth, upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id) ? String(req.user.id || req.user._id) : '';
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

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
      bathrooms: req.body.bathrooms ? req.body.bathrooms : 0,
      balcony: req.body.balcony ? req.body.balcony : 0,
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
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Basic get (optionally restricted to user via header) - kept for existing UI
// --------------------------------------------------
// Return listings for the authenticated user (management). Public browsing uses /search and /:id.
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id) ? String(req.user.id || req.user._id) : '';
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const listings = await Listing.find({ userId }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Advanced search endpoint (public browse)
// --------------------------------------------------
router.get('/search', async (req, res) => {
  try {
    const {
      q,
      type,
      division,
      district,
      subdistrict,
      area,
      priceMin,
      priceMax,
      roomsMin,
      roomsMax,
      bathroomsMin,
      bathroomsMax,
      personMin,
      personMax,
      balconyMin,
      balconyMax,
      serviceChargeMin,
      serviceChargeMax,
      page = '1',
      limit = '20',
      sort = 'newest',
      isRented,
    } = req.query;

    const filter = {};

    if (q && q.trim()) {
      const kw = q.trim();
      filter.$or = [
        { title: { $regex: kw, $options: 'i' } },
        { description: { $regex: kw, $options: 'i' } },
        { area: { $regex: kw, $options: 'i' } },
        { subdistrict: { $regex: kw, $options: 'i' } },
        { district: { $regex: kw, $options: 'i' } },
        { division: { $regex: kw, $options: 'i' } },
      ];
    }

    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length === 1) filter.type = types[0];
      else if (types.length > 1) filter.type = { $in: types };
    }

    if (division) filter.division = division;
    if (district) filter.district = district;
    if (subdistrict) filter.subdistrict = subdistrict;
    if (area) filter.area = area;

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }

    if (roomsMin || roomsMax) {
      filter.rooms = {};
      if (roomsMin) filter.rooms.$gte = Number(roomsMin);
      if (roomsMax) filter.rooms.$lte = Number(roomsMax);
    }

    if (bathroomsMin || bathroomsMax) {
      filter.bathrooms = {};
      if (bathroomsMin) filter.bathrooms.$gte = Number(bathroomsMin);
      if (bathroomsMax) filter.bathrooms.$lte = Number(bathroomsMax);
    }

    if (personMin || personMax) {
      filter.personCount = {};
      if (personMin) filter.personCount.$gte = Number(personMin);
      if (personMax) filter.personCount.$lte = Number(personMax);
    }

    if (balconyMin || balconyMax) {
      filter.balcony = {};
      if (balconyMin) filter.balcony.$gte = Number(balconyMin);
      if (balconyMax) filter.balcony.$lte = Number(balconyMax);
    }

    if (serviceChargeMin || serviceChargeMax) {
      filter.serviceCharge = {};
      if (serviceChargeMin) filter.serviceCharge.$gte = Number(serviceChargeMin);
      if (serviceChargeMax) filter.serviceCharge.$lte = Number(serviceChargeMax);
    }

    if (typeof isRented !== 'undefined') {
      if (isRented === 'true') filter.isRented = true; else if (isRented === 'false') filter.isRented = false;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
    };
    const sortOpt = sortMap[sort] || sortMap.newest;

    const [data, total] = await Promise.all([
      Listing.find(filter).sort(sortOpt).skip(skip).limit(limitNum),
      Listing.countDocuments(filter),
    ]);

    res.json({
      data,
      page: pageNum,
      pageSize: data.length,
      limit: limitNum,
      total,
      hasMore: skip + data.length < total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Get single listing
// --------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const doc = await Listing.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Update listing (only by owner)
// --------------------------------------------------
router.put('/:id', auth, upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id) ? String(req.user.id || req.user._id) : '';
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const doc = await Listing.findOne({ _id: req.params.id, userId });
    if (!doc) return res.status(404).json({ error: 'Not found or not owner' });

    const base = `${req.protocol}://${req.get('host')}`;
    const newPhotoUrls = (req.files?.photos || []).map((f) => `${base}/uploads/${f.filename}`);
    const keep = req.body.existingPhotoUrls ? JSON.parse(req.body.existingPhotoUrls) : doc.photoUrls;

    // Track originals to know what to delete later
    const originalPhotoUrls = Array.isArray(doc.photoUrls) ? [...doc.photoUrls] : [];
    const originalVideoUrl = doc.videoUrl || '';

    doc.title = req.body.title ?? doc.title;
    doc.description = req.body.description ?? doc.description;
    doc.type = req.body.type ?? doc.type;
    if (typeof req.body.price !== 'undefined') {
      const n = Number(req.body.price);
      doc.price = Number.isFinite(n) && n > 0 ? n : 0;
    }
    if (req.body.availableFrom) doc.availableFrom = new Date(req.body.availableFrom);
    if (typeof req.body.rooms !== 'undefined') doc.rooms = Number(req.body.rooms);
    if (req.body.bathrooms) doc.bathrooms = Number(req.body.bathrooms);
    if (req.body.balcony) doc.balcony = Number(req.body.balcony);
    if (req.body.personCount) doc.personCount = Number(req.body.personCount);
    if (typeof req.body.isRented !== 'undefined') doc.isRented = req.body.isRented === 'true' || req.body.isRented === true;
    if (req.body.features) doc.features = req.body.features.split(',').map((s) => s.trim()).filter(Boolean);
    if (typeof req.body.division !== 'undefined') doc.division = req.body.division;
    if (typeof req.body.district !== 'undefined') doc.district = req.body.district;
    if (typeof req.body.subdistrict !== 'undefined') doc.subdistrict = req.body.subdistrict;
    if (typeof req.body.area !== 'undefined') doc.area = req.body.area;
    if (typeof req.body.road !== 'undefined') doc.road = req.body.road;
    if (typeof req.body.houseNo !== 'undefined') doc.houseNo = req.body.houseNo;
    if (typeof req.body.floor !== 'undefined') doc.floor = Number(req.body.floor);
    if (typeof req.body.totalFloors !== 'undefined') doc.totalFloors = Number(req.body.totalFloors) || 0;
    if (typeof req.body.furnishing !== 'undefined') doc.furnishing = req.body.furnishing;
    if (typeof req.body.deposit !== 'undefined') doc.deposit = Math.max(0, Number(req.body.deposit)) || 0;
    if (typeof req.body.serviceCharge !== 'undefined') doc.serviceCharge = Math.max(0, Number(req.body.serviceCharge)) || 0;
    if (typeof req.body.negotiable !== 'undefined')
      doc.negotiable = req.body.negotiable === 'true' || req.body.negotiable === true;

    if (req.body.utilitiesIncluded)
      doc.utilitiesIncluded = req.body.utilitiesIncluded.split(',').map(s => s.trim()).filter(Boolean);

    doc.photoUrls = [...keep, ...newPhotoUrls];
    let removedVideoUrl = '';
    if (req.files?.video?.[0]) {
      // Replace with newly uploaded video
      removedVideoUrl = originalVideoUrl;
      doc.videoUrl = `${base}/uploads/${req.files.video[0].filename}`;
    } else if (req.body.removeVideo === 'true') {
      // Explicitly remove existing video
      removedVideoUrl = originalVideoUrl;
      doc.videoUrl = '';
    } else if (req.body.existingVideoUrl) {
      // Keep existing video when the client confirms it should remain
      doc.videoUrl = req.body.existingVideoUrl;
    }

    if (req.files?.video?.[0])
      doc.videoUrl = `${base}/uploads/${req.files.video[0].filename}`;

    if (typeof req.body.contactName !== 'undefined')
      doc.contactName = req.body.contactName;

    if (typeof req.body.phone !== 'undefined')
      doc.phone = req.body.phone;

    if (typeof req.body.sizeSqft !== 'undefined')
      doc.sizeSqft = Number(req.body.sizeSqft);

    const updated = await doc.save();

    // After successful save, delete any removed photos/videos from disk (best effort)
    const removedPhotos = originalPhotoUrls.filter((u) => !doc.photoUrls.includes(u));
    const pathsToDelete = [
      ...removedPhotos.map(urlToUploadPath),
      urlToUploadPath(removedVideoUrl),
    ].filter(Boolean);
    // Fire and forget
    Promise.all(pathsToDelete.map(unlinkSafe)).catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Delete listing (owner only)
// --------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id) ? String(req.user.id || req.user._id) : '';
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const deleted = await Listing.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ error: 'Not found or not owner' });

    // Best-effort cleanup of files referenced by the deleted listing
    const fileUrls = [...(deleted.photoUrls || []), deleted.videoUrl || ''].filter(Boolean);
    const filePaths = fileUrls.map(urlToUploadPath).filter(Boolean);
    Promise.all(filePaths.map(unlinkSafe)).catch(() => {});

    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
