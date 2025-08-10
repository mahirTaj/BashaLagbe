const express = require('express');
const router = express.Router();
const Listing = require('../models/listings');
const multer = require('multer');
const path = require('path');

// Dummy auth: take user id from header 'x-user-id' or query '?userId='
function getUserId(req) {
  return (req.headers['x-user-id'] || req.query.userId || '').toString();
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Create listing (requires userId)
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
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get listings with filters
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const filter = {};

    if (userId) filter.userId = userId;

    if (req.query.search) {
      const keyword = req.query.search.trim();
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    ['division', 'district', 'subdistrict', 'area'].forEach((field) => {
      if (req.query[field]) {
        filter[field] = req.query[field];
      }
    });

    if (req.query.priceMin || req.query.priceMax) {
      filter.price = {};
      if (req.query.priceMin) filter.price.$gte = Number(req.query.priceMin);
      if (req.query.priceMax) filter.price.$lte = Number(req.query.priceMax);
    }

    if (req.query.rooms) {
      filter.rooms = Number(req.query.rooms);
    }

    const listings = await Listing.find(filter).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update listing (only by owner)
router.put('/:id', upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const doc = await Listing.findOne({ _id: req.params.id, userId });
    if (!doc) return res.status(404).json({ error: 'Not found or not owner' });

    const base = `${req.protocol}://${req.get('host')}`;
    const newPhotoUrls = (req.files?.photos || []).map((f) => `${base}/uploads/${f.filename}`);
    const keep = req.body.existingPhotoUrls ? JSON.parse(req.body.existingPhotoUrls) : doc.photoUrls;

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

    if (req.files?.video?.[0])
      doc.videoUrl = `${base}/uploads/${req.files.video[0].filename}`;

    if (typeof req.body.contactName !== 'undefined')
      doc.contactName = req.body.contactName;

    if (typeof req.body.phone !== 'undefined')
      doc.phone = req.body.phone;

    if (typeof req.body.sizeSqft !== 'undefined')
      doc.sizeSqft = Number(req.body.sizeSqft);

    const updated = await doc.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete listing (only by owner)
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const deleted = await Listing.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ error: 'Not found or not owner' });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
