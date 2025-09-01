const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Listing = require('../models/listings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const {sendNotification} =require('../utils/sendNotifications');

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

// Create listing (requires userId)
router.post(
  '/',
  authMiddleware,
  upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]),
  async (req, res) => {
    try {
      const userId = String(req.user._id);
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const base = `${req.protocol}://${req.get('host')}`;
      const photoUrls = (req.files?.photos || []).map((f) => `${base}/uploads/${f.filename}`);
      const videoUrl = req.files?.video?.[0] ? `${base}/uploads/${req.files.video[0].filename}` : '';

      // Validate required fields
      const missing = [];
      if (!req.body.title || !req.body.title.trim()) missing.push('title');
      if (!req.body.price) missing.push('price');
      if (!req.body.type) missing.push('type');
      if (!req.body.division) missing.push('division');
      if (!req.body.district) missing.push('district');
      if (!req.body.subdistrict) missing.push('subdistrict');
      if (!req.body.area) missing.push('area');
      if (!req.body.phone || !req.body.phone.trim()) missing.push('phone');
      if (!req.body.floor) missing.push('floor');
      if (!req.body.rooms) missing.push('rooms');
      if (!req.body.availableFrom) missing.push('availableFrom');
      if (photoUrls.length === 0) missing.push('photos');
      if (missing.length) return res.status(400).json({ error: 'Missing required fields', fields: missing });

      const payload = {
        ...req.body,
        userId,
        price: Number(req.body.price) || 0,
        rooms: Number(req.body.rooms),
        bathrooms: Number(req.body.bathrooms) || 0,
        balcony: Number(req.body.balcony) || 0,
        personCount: Number(req.body.personCount) || 1,
        isRented: req.body.isRented === 'true' || req.body.isRented === true,
        features: req.body.features
          ? req.body.features.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        floor: Number(req.body.floor),
        totalFloors: Number(req.body.totalFloors) || 0,
        furnishing: req.body.furnishing || 'Unfurnished',
        deposit: Math.max(0, Number(req.body.deposit) || 0),
        serviceCharge: Math.max(0, Number(req.body.serviceCharge) || 0),
        negotiable: req.body.negotiable === 'true' || req.body.negotiable === true,
        utilitiesIncluded: req.body.utilitiesIncluded
          ? req.body.utilitiesIncluded.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        contactName: req.body.contactName || '',
        phone: req.body.phone || '',
        availableFrom: new Date(req.body.availableFrom),
        photoUrls,
        videoUrl,
        sizeSqft: Number(req.body.sizeSqft) || 0,
      };

      const listing = new Listing(payload);
      const saved = await listing.save();

      // ✅ Send notification for new listing
      try {
        console.log(`[Notification] Sending listing_created for userId: ${saved.userId}`);
        await sendNotification(
          saved.userId,
          'listing_created',
          'New Listing Added',
          `Your listing "${saved.title}" has been added!`,
          `/listing/${saved._id}`
        );
      } catch (err) {
        console.error('[Notification Error]', err);
      }

      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

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
      if (isRented === 'true') filter.isRented = true;
      else if (isRented === 'false') filter.isRented = false;
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

// Update listing (only by owner)
router.put('/:id',  authMiddleware,upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = String(req.user._id);// <-- convert ObjectId to string
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Find listing by ID AND owner
    const doc = await Listing.findOne({ _id: req.params.id, userId });
    if (!doc) return res.status(404).json({ error: 'Not found or not owner' });

    const originalPhotoUrls = Array.isArray(doc.photoUrls) ? [...doc.photoUrls] : [];
    const originalVideoUrl = doc.videoUrl || '';
    const originalPrice = doc.price;
    const originalTitle = doc.title;

    const base = `${req.protocol}://${req.get('host')}`;
    const newPhotoUrls = (req.files?.photos || []).map((f) => `${base}/uploads/${f.filename}`);
    const keep = req.body.existingPhotoUrls ? JSON.parse(req.body.existingPhotoUrls) : doc.photoUrls;

    // Update fields safely
    doc.title = req.body.title ?? doc.title;
    doc.description = req.body.description ?? doc.description;
    doc.type = req.body.type ?? doc.type;
    if (typeof req.body.price !== 'undefined') {
      const n = Number(req.body.price);
      doc.price = Number.isFinite(n) && n >= 0 ? n : doc.price;
    }
    if (req.body.availableFrom) doc.availableFrom = new Date(req.body.availableFrom);
    if (typeof req.body.rooms !== 'undefined') doc.rooms = Number(req.body.rooms);
    if (req.body.bathrooms) doc.bathrooms = Number(req.body.bathrooms);
    if (req.body.balcony) doc.balcony = Number(req.body.balcony);
    if (req.body.personCount) doc.personCount = Number(req.body.personCount);
    if (typeof req.body.isRented !== 'undefined') doc.isRented = req.body.isRented === 'true' || req.body.isRented === true;
    if (req.body.features) doc.features = req.body.features.split(',').map((s) => s.trim()).filter(Boolean);

    // Address & other fields
    ['division', 'district', 'subdistrict', 'area', 'road', 'houseNo', 'furnishing', 'contactName', 'phone'].forEach(field => {
      if (typeof req.body[field] !== 'undefined') doc[field] = req.body[field];
    });
    ['floor', 'totalFloors', 'deposit', 'serviceCharge', 'sizeSqft'].forEach(field => {
      if (typeof req.body[field] !== 'undefined') doc[field] = Number(req.body[field]) || 0;
    });
    if (typeof req.body.negotiable !== 'undefined') doc.negotiable = req.body.negotiable === 'true' || req.body.negotiable === true;
    if (typeof req.body.utilitiesIncluded !== 'undefined') doc.utilitiesIncluded = req.body.utilitiesIncluded.split(',').map(s => s.trim()).filter(Boolean);

    // Media
    doc.photoUrls = [...keep, ...newPhotoUrls];
    if (req.files?.video?.[0]) doc.videoUrl = `${base}/uploads/${req.files.video[0].filename}`;
    else if (req.body.removeVideo === 'true') doc.videoUrl = '';
    else if (req.body.existingVideoUrl) doc.videoUrl = req.body.existingVideoUrl;

    // Basic validation
    const requiredFields = ['title', 'price', 'type', 'floor', 'rooms', 'availableFrom', 'division', 'district', 'subdistrict', 'area', 'phone'];
    const missing = requiredFields.filter(f => {
      const v = doc[f];
      if (f === 'floor' || f === 'rooms') return !(typeof v === 'number') || v < 0;
      return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    });
    if (!doc.photoUrls.length) missing.push('photos');
    if (missing.length) return res.status(400).json({ error: 'Missing required fields', fields: missing });

    const updated = await doc.save();

    // Send notification if price or title changed
    if (doc.price !== originalPrice || doc.title !== originalTitle) {
      try {
        console.log(`[Notification] Sending listing_updated for userId: ${doc.userId}`);
        await sendNotification(
          doc.userId,
          'listing_updated',
          'Listing Updated',
          `Your listing "${doc.title}" has been updated!`,
          `/listing/${doc._id}`
        );
      } catch (err) {
        console.error('[Notification Error]', err);
      }
    }

    res.json({ _id: updated._id, message: 'Listing updated successfully', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Delete listing (owner only)
// --------------------------------------------------
router.delete('/:id',authMiddleware, async (req, res) => {
  try {
    const userIdStr = String(req.user._id);// ✅ ensure string
    if (!userIdStr) return res.status(400).json({ error: 'userId required' });

    // Find and delete listing owned by this user
    const deleted = await Listing.findOneAndDelete({ _id: req.params.id, userId: userIdStr });
    if (!deleted) return res.status(404).json({ error: 'Not found or not owner' });

    // Delete associated files safely
    const fileUrls = [...(deleted.photoUrls || []), deleted.videoUrl || ''].filter(Boolean);
    const filePaths = fileUrls.map(urlToUploadPath).filter(Boolean);
    Promise.all(filePaths.map(unlinkSafe)).catch(() => {});

    // ✅ Optionally send notification on deletion
    try {
      console.log(`[Notification] Sending listing_deleted for userId: ${deleted.userId}`);
      await sendNotification(
        deleted.userId,
        'listing_deleted',
        'Listing Deleted',
        `Your listing "${deleted.title}" has been deleted.`,
        `/listing/${deleted._id}`
      );
    } catch (err) {
      console.error('[Notification Error]', err);
    }

    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
