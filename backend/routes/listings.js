const express = require('express');
const router = express.Router();
const Listing = require('../models/listings');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { authenticate, requireRole } = require('../middleware/auth');
const { cloudinary, upload, useCloudinary } = require('../config/cloudinary');

// Helper to extract Cloudinary public ID from a URL
function getPublicIdFromUrl(url) {
    if (!url) return null;
    try {
        const parts = url.split('/');
        const publicIdWithFormat = parts.slice(parts.indexOf('basha-lagbe-listings')).join('/').split('.')[0];
        return publicIdWithFormat;
    } catch (e) {
        console.error('Could not extract public ID from URL:', url, e);
        return null;
    }
}

// Create listing (requires authenticated owner)
// Lightweight middleware that runs before multer to help determine whether multer/cloudinary fails
function preMulterDebug(req, res, next) {
  try {
    console.log('[listings] preMulterDebug headers.authorization=', !!req.headers.authorization ? '[present]' : '[missing]', 'content-type=', req.get('content-type'));
  } catch (e) {
    console.log('[listings] preMulterDebug failed', e);
  }
  next();
}

router.post('/', authenticate, preMulterDebug, upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    // Debug: log incoming files and a small portion of body to help troubleshoot upload errors
    try { console.log('[listings] Create listing incoming:', { files: Object.keys(req.files || {}).reduce((acc, k) => ({ ...acc, [k]: (req.files[k] || []).length }), {}), bodyKeys: Object.keys(req.body || {}).slice(0,10) }); } catch (e) { console.log('[listings] Create listing debug log failed', e); }
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication failed: User ID not found.' });
        }

    // Build accessible URLs depending on whether Cloudinary is configured
    const photoFiles = (req.files?.photos || []);
    const photoUrls = photoFiles.map((f) => {
      if (useCloudinary) return f.path; // cloudinary returns full https path in path
      // local disk: serve via /uploads
      return `/uploads/${f.filename || f.path.split(/[\\/]/).pop()}`;
    });
    const videoFile = req.files?.video?.[0];
    const videoUrl = videoFile ? (useCloudinary ? videoFile.path : `/uploads/${videoFile.filename || videoFile.path.split(/[\\/]/).pop()}`) : '';

  // Debug incoming propertyType
  try { console.log('[listings] incoming propertyType raw =', JSON.stringify(req.body.propertyType)); } catch (e) {}
  // Normalize propertyType input (accept common values and map to schema enum)
    try {
      const ptRaw = (req.body.propertyType || '').toString().trim().toLowerCase();
      if (ptRaw) {
        if (['rent','for rent','for_rent','forrent','rental'].includes(ptRaw)) {
          req.body.propertyType = 'For Rent';
        } else if (['sale','for sale','forsale'].includes(ptRaw)) {
          req.body.propertyType = 'For Sale';
        } else {
          // preserve original casing if it's already in a valid form
          req.body.propertyType = req.body.propertyType;
        }
      }
    } catch (e) { console.warn('[listings] propertyType normalization failed', e); }

    // Basic required validations
        const missing = [];
        if (!req.body.title || !req.body.title.trim()) missing.push('title');
        if (req.body.price === undefined || req.body.price === '') missing.push('price');
        if (!req.body.type) missing.push('type');
        if (!req.body.division) missing.push('division');
        if (!req.body.district) missing.push('district');
        if (!req.body.subdistrict) missing.push('subdistrict');
        if (!req.body.area) missing.push('area');
        if (req.body.propertyType === undefined || req.body.propertyType === '') missing.push('propertyType');
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

        // Optional geo: only accept if within Bangladesh bounds
        const lat = Number(req.body.lat);
        const lng = Number(req.body.lng);
        const inRange = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 20.5 && lat <= 26.7 && lng >= 88 && lng <= 92.7;
        if (inRange) {
            payload.lat = lat;
            payload.lng = lng;
            payload.location = { type: 'Point', coordinates: [lng, lat] };
        }
        const listing = new Listing(payload);
        const saved = await listing.save();
        res.status(201).json(saved);
  } catch (err) {
    // Ensure we log full error object and stack for debugging
    try { console.error('Create listing error:', err, '\nstack:\n', err && err.stack); } catch (e) { console.error('Failed to log error object', e); }
    // Also append the full stack to a persistent log so we can inspect it even when console output isn't visible
    try {
      const logsDir = path.join(__dirname, '..', 'logs');
      try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) {}
      const logPath = path.join(logsDir, 'listing_errors.log');
      const entry = `${new Date().toISOString()} - ERROR creating listing:\n${(err && (err.stack || err.message)) || JSON.stringify(err)}\n\n`;
      fs.appendFileSync(logPath, entry, { encoding: 'utf8' });
    } catch (e) {
      console.error('Failed to append listing error to file:', e);
    }
    // If the error has a message, return it; otherwise return generic
    res.status(500).json({ error: (err && err.message) || 'Server error' });
  }
});

// --------------------------------------------------
// Map endpoints (Bangladesh-only)
// - GET /api/listings/in-bounds?west&south&east&north
// - GET /api/listings/near?lat&lng&radiusKm
// --------------------------------------------------

// Bangladesh bounding box (approx): lat 20.5..26.7, lng 88..92.7
const BD_BOUNDS = { south: 20.5, north: 26.7, west: 88.0, east: 92.7 };

function clampToBdBounds({ west, south, east, north }) {
  return {
    west: Math.max(BD_BOUNDS.west, Math.min(BD_BOUNDS.east, west)),
    east: Math.max(BD_BOUNDS.west, Math.min(BD_BOUNDS.east, east)),
    south: Math.max(BD_BOUNDS.south, Math.min(BD_BOUNDS.north, south)),
    north: Math.max(BD_BOUNDS.south, Math.min(BD_BOUNDS.north, north)),
  };
}

router.get('/in-bounds', async (req, res) => {
  try {
    let west = Number(req.query.west);
    let south = Number(req.query.south);
    let east = Number(req.query.east);
    let north = Number(req.query.north);
    if (![west, south, east, north].every(Number.isFinite)) {
      return res.status(400).json({ error: 'Invalid bounds' });
    }

    ({ west, south, east, north } = clampToBdBounds({ west, south, east, north }));

    const filter = {
      location: {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [[
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ]],
          },
        },
      },
    };

    const docs = await Listing.find(
      filter,
      { title: 1, price: 1, type: 1, photoUrls: 1, lat: 1, lng: 1, location: 1 }
    ).limit(500).lean();

    res.json(
      docs.map((d) => ({
        _id: d._id,
        title: d.title,
        price: d.price,
        type: d.type,
        lat: d.lat ?? d.location?.coordinates?.[1],
        lng: d.lng ?? d.location?.coordinates?.[0],
        photo: d.photoUrls?.[0] || '',
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/near', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm || '2');
    const inBd = Number.isFinite(lat) && Number.isFinite(lng) && lat >= BD_BOUNDS.south && lat <= BD_BOUNDS.north && lng >= BD_BOUNDS.west && lng <= BD_BOUNDS.east;
    if (!inBd) return res.status(400).json({ error: 'Point must be inside Bangladesh' });
    const meters = Math.max(50, Math.min(50000, (Number.isFinite(radiusKm) ? radiusKm : 2) * 1000));

    const docs = await Listing.find(
      {
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: meters,
          },
        },
      },
      { title: 1, price: 1, type: 1, photoUrls: 1, lat: 1, lng: 1, location: 1 }
    )
      .limit(200)
      .lean();

    res.json(
      docs.map((d) => ({
        _id: d._id,
        title: d.title,
        price: d.price,
        type: d.type,
        lat: d.lat ?? d.location?.coordinates?.[1],
        lng: d.lng ?? d.location?.coordinates?.[0],
        photo: d.photoUrls?.[0] || '',
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Get user's own listings (requires authentication)
// --------------------------------------------------
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const listings = await Listing.find({ userId }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Advanced search endpoint (public browse)
// Query params:
// q=keyword (title/description)
// type=Apartment[,Room,...]
// division=Dhaka&district=... etc (exact match)
// priceMin= & priceMax=
// roomsMin= & roomsMax=
// page=1&limit=20
// sort=price_asc|price_desc|newest|oldest
// --------------------------------------------------
router.get('/search', async (req, res) => {
  const start = Date.now();
  try {
    console.log('[listings/search] query params:', req.query);
    const {
      q,
      type,
      division,
      district,
      subdistrict,
  propertyType,
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

    // Keyword (regex OR). For larger scale consider a text index and $text.
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

    // Multi / single type
    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length === 1) filter.type = types[0];
      else if (types.length > 1) filter.type = { $in: types };
    }

    // Deal type (rent/sale) mapping to schema field propertyType
    if (typeof propertyType !== 'undefined' && propertyType !== '') {
      const mapped = mapDealType(propertyType) || (isListingCategory(propertyType) ? null : propertyType);
      if (mapped) {
        filter.propertyType = mapped;
      }
    }

    // Exact location filters (cascading)
    if (division) filter.division = division;
    if (district) filter.district = district;
    if (subdistrict) filter.subdistrict = subdistrict;
    if (area) filter.area = area;

    // Price range
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }

    // Rooms range
    if (roomsMin || roomsMax) {
      filter.rooms = {};
      if (roomsMin) filter.rooms.$gte = Number(roomsMin);
      if (roomsMax) filter.rooms.$lte = Number(roomsMax);
    }

    // Bathrooms (washrooms) range
    if (bathroomsMin || bathroomsMax) {
      filter.bathrooms = {};
      if (bathroomsMin) filter.bathrooms.$gte = Number(bathroomsMin);
      if (bathroomsMax) filter.bathrooms.$lte = Number(bathroomsMax);
    }

    // Person capacity range
    if (personMin || personMax) {
      filter.personCount = {};
      if (personMin) filter.personCount.$gte = Number(personMin);
      if (personMax) filter.personCount.$lte = Number(personMax);
    }

    // Balcony (corridor?) range
    if (balconyMin || balconyMax) {
      filter.balcony = {};
      if (balconyMin) filter.balcony.$gte = Number(balconyMin);
      if (balconyMax) filter.balcony.$lte = Number(balconyMax);
    }

    // Service charge range
    if (serviceChargeMin || serviceChargeMax) {
      filter.serviceCharge = {};
      if (serviceChargeMin) filter.serviceCharge.$gte = Number(serviceChargeMin);
      if (serviceChargeMax) filter.serviceCharge.$lte = Number(serviceChargeMax);
    }

    if (typeof isRented !== 'undefined') {
      if (isRented === 'true') filter.isRented = true; else if (isRented === 'false') filter.isRented = false;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
    };
    const sortOpt = sortMap[sort] || sortMap.newest;

    let data = [];
    let total = 0;
    try {
      data = await Listing.find(filter).sort(sortOpt).skip(skip).limit(limitNum).exec();
      total = await Listing.countDocuments(filter).exec();
    } catch (dbErr) {
      console.error('[listings/search] Mongo query error:', dbErr.message, { filter, sortOpt, skip, limitNum });
      return res.status(500).json({ error: 'Database query failed', details: process.env.NODE_ENV === 'production' ? undefined : dbErr.message });
    }

    res.json({
      data,
      page: pageNum,
      pageSize: data.length,
      limit: limitNum,
      total,
      hasMore: skip + data.length < total,
      tookMs: Date.now() - start,
    });
  } catch (err) {
    console.error('[listings/search] Handler error:', err);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// --------------------------------------------------
// Get single listing
// --------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    // Only handle valid ObjectId IDs here; otherwise let other routes (e.g., '/reports') match
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next();
    const doc = await Listing.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update listing (requires authenticated owner of the listing)
router.put('/:id', authenticate, preMulterDebug, upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.auth?.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid listing ID' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'Authentication failed: User ID not found.' });
        }

        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        // IMPORTANT: Authorize that the user owns this listing
        if (listing.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to edit this listing.' });
        }

        const newPhotoUrls = (req.files?.photos || []).map((f) => f.path);
        
        let existingPhotoUrls = [];
        try {
            existingPhotoUrls = req.body.existingPhotoUrls ? JSON.parse(req.body.existingPhotoUrls) : [];
        } catch (e) {
            return res.status(400).json({ error: 'Invalid format for existingPhotoUrls.' });
        }

    const urlsToDelete = listing.photoUrls.filter(url => !existingPhotoUrls.includes(url));
    for (const url of urlsToDelete) {
      const publicId = getPublicIdFromUrl(url);
      if (useCloudinary && publicId && cloudinary) {
        try { await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }); } catch (e) { console.error('Failed to destroy cloud image', e); }
      } else {
        // If local file, attempt unlink
        try {
          const filename = url.split('/').pop();
          const fp = require('path').join(__dirname, '..', 'uploads', filename);
          require('fs').unlinkSync(fp);
        } catch (e) { /* ignore */ }
      }
    }

        const finalPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];

        let finalVideoUrl = listing.videoUrl;
        const removeVideo = req.body.removeVideo === 'true';
        const newVideoFile = req.files?.video?.[0];

        if (newVideoFile) {
            if (listing.videoUrl) {
                const oldPublicId = getPublicIdFromUrl(listing.videoUrl);
                if (oldPublicId) await cloudinary.uploader.destroy(oldPublicId, { resource_type: 'video' });
            }
            finalVideoUrl = newVideoFile.path;
        } else if (removeVideo) {
            if (listing.videoUrl) {
                const oldPublicId = getPublicIdFromUrl(listing.videoUrl);
                if (oldPublicId) await cloudinary.uploader.destroy(oldPublicId, { resource_type: 'video' });
            }
            finalVideoUrl = '';
        }
        
    // Normalize propertyType for update as well
    try {
      const ptRawU = (req.body.propertyType || '').toString().trim().toLowerCase();
      if (ptRawU) {
        if (['rent','for rent','for_rent','forrent','rental'].includes(ptRawU)) req.body.propertyType = 'For Rent';
        else if (['sale','for sale','forsale'].includes(ptRawU)) req.body.propertyType = 'For Sale';
      }
    } catch (e) { console.warn('[listings] propertyType (update) normalization failed', e); }

    const updatePayload = {
      ...req.body,
            price: Number(req.body.price) || 0,
            rooms: Number(req.body.rooms) || 0,
            bathrooms: Number(req.body.bathrooms) || 0,
            balcony: Number(req.body.balcony) || 0,
            personCount: Number(req.body.personCount) || 1,
            floor: Number(req.body.floor) || 0,
            totalFloors: Number(req.body.totalFloors) || 0,
            deposit: Number(req.body.deposit) || 0,
            serviceCharge: Number(req.body.serviceCharge) || 0,
            sizeSqft: Number(req.body.sizeSqft) || 0,
            isRented: req.body.isRented === 'true',
            negotiable: req.body.negotiable === 'true',
            features: req.body.features ? req.body.features.split(',').map(s => s.trim()).filter(Boolean) : [],
            utilitiesIncluded: req.body.utilitiesIncluded ? req.body.utilitiesIncluded.split(',').map(s => s.trim()).filter(Boolean) : [],
            availableFrom: new Date(req.body.availableFrom),
            photoUrls: finalPhotoUrls,
            videoUrl: finalVideoUrl,
        };

        const lat = Number(req.body.lat);
        const lng = Number(req.body.lng);
        const inRange = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 20.5 && lat <= 26.7 && lng >= 88 && lng <= 92.7;
        if (inRange) {
            updatePayload.lat = lat;
            updatePayload.lng = lng;
            updatePayload.location = { type: 'Point', coordinates: [lng, lat] };
        } else {
            updatePayload.lat = undefined;
            updatePayload.lng = undefined;
            updatePayload.location = undefined;
        }

        const updatedListing = await Listing.findByIdAndUpdate(id, { $set: updatePayload }, { new: true, runValidators: true });

        if (!updatedListing) {
            return res.status(404).json({ error: 'Listing not found after update.' });
        }

        res.status(200).json(updatedListing);
    } catch (err) {
        console.error('Update listing error:', err);
        res.status(500).json({ error: 'An unexpected error occurred during update.', details: err.message });
    }
});

// Delete listing (owner only)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: 'userId required' });

        const deleted = await Listing.findOneAndDelete({ _id: req.params.id, userId });
        if (!deleted) return res.status(404).json({ error: 'Not found or not owner' });

        // Cleanup files from Cloudinary
        const photoPublicIds = (deleted.photoUrls || []).map(getPublicIdFromUrl).filter(Boolean);
        if (photoPublicIds.length > 0) {
            await cloudinary.api.delete_resources(photoPublicIds, { resource_type: 'image' });
        }
        if (deleted.videoUrl) {
            const videoPublicId = getPublicIdFromUrl(deleted.videoUrl);
            if (videoPublicId) {
                await cloudinary.uploader.destroy(videoPublicId, { resource_type: 'video' });
            }
        }

        res.json({ message: 'Listing deleted' });
    } catch (err) {
        console.error('Delete listing error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --------------------------------------------------
// Rental Trends Analytics (Public)
// --------------------------------------------------

// Get available areas and districts for filtering
router.get('/trends/areas', async (req, res) => {
  try {
    const areas = await MarketSample.distinct('area');
    const districts = await MarketSample.distinct('district');
    // Also provide popular (by count) areas/districts from last 12 months to help frontends choose defaults that have data
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const [popularAreasAgg, popularDistrictsAgg] = await Promise.all([
      MarketSample.aggregate([
        { $match: { createdAt: { $gte: since }, area: { $exists: true, $ne: '' } } },
        { $group: { _id: '$area', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        { $project: { _id: 0, name: '$_id' } }
      ]),
      MarketSample.aggregate([
        { $match: { createdAt: { $gte: since }, district: { $exists: true, $ne: '' } } },
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        { $project: { _id: 0, name: '$_id' } }
      ])
    ]);
    res.json({
      areas: areas.filter(a => a).sort(),
      districts: districts.filter(d => d).sort(),
      popularAreas: popularAreasAgg.map(a => a.name),
      popularDistricts: popularDistrictsAgg.map(d => d.name)
    });
  } catch (err) {
    console.error('Areas fetch error', err);
    res.status(500).json({ error: 'Failed to fetch areas' });
  }
});

// Get rental trends by area and time period
router.get('/trends/data', async (req, res) => {
  try {
    const { area, district, period = 'month' } = req.query;

    // Build match filter
    const match = {};
    if (area) match.area = area;
    if (district) match.district = district;

    // Determine date format based on period
  const dateFormat = period === 'year' ? '%Y' : '%Y-%m';
  const groupBy = period === 'year' ? '$year' : '$month';

    // Date window similar to compare route
    const since = new Date();
    if (period === 'year') {
      since.setFullYear(since.getFullYear() - 5);
    } else {
      since.setMonth(since.getMonth() - 18);
    }

    const buildPipeline = (fromDate) => ([
      { $match: { ...match, ...(fromDate ? { createdAt: { $gte: fromDate } } : {}) } },
      {
        $addFields: {
          period: { $dateToString: { format: dateFormat, date: '$createdAt' } }
        }
      },
      {
        $group: {
          _id: { period: '$period', area: '$area', district: '$district' },
          avgRent: { $avg: '$rent' },
          minRent: { $min: '$rent' },
          maxRent: { $max: '$rent' },
          count: { $sum: 1 },
          totalRent: { $sum: '$rent' }
        }
      },
      {
        $project: {
          period: '$_id.period',
          area: '$_id.area',
          district: '$_id.district',
          avgRent: { $round: ['$avgRent', 0] },
          minRent: 1,
          maxRent: 1,
          count: 1,
          totalRent: { $round: ['$totalRent', 0] },
          _id: 0
        }
      },
      { $sort: { period: 1, area: 1 } }
    ]);

    // First attempt within recent window
    let data = await MarketSample.aggregate(buildPipeline(since));
    // Fallback: if no data, broaden the window to include all time
    if (!data || data.length === 0) {
      console.warn('Trends/data found no records in recent window; broadening search. Filters:', { area, district, period });
      data = await MarketSample.aggregate(buildPipeline(null));
    }

    // Group by area for easier frontend processing
    const groupedData = {};
    data.forEach(item => {
      const key = item.area || 'Unknown';
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(item);
    });

    res.json({
      success: true,
      data: groupedData,
      period,
      filters: { area, district }
    });
  } catch (err) {
    console.error('Trends data error', err);
    res.status(500).json({ error: 'Failed to fetch trends data' });
  }
});

// Get rental trends comparison between areas
router.get('/trends/compare', async (req, res) => {
  try {
    const {
      areas,
      districts,
      period = 'month',
      source = 'scraped',
      // optional filters
      bedroomsMin,
      bedroomsMax,
  roomsMin,
  roomsMax,
  rooms, // accept exact rooms as a single param from client
      propertyType,
      sqftMin,
      sqftMax
    } = req.query;
    
    console.log('Compare trends request:', { areas, districts, period, source, propertyType });

    // Date window for stability
    const since = new Date();
    if (period === 'year') {
      since.setFullYear(since.getFullYear() - 5);
    } else {
      since.setMonth(since.getMonth() - 18);
    }
    
  let areaList = areas ? areas.split(',').map(s => (s || '').trim()).filter(Boolean) : [];
  let districtList = districts ? districts.split(',').map(s => (s || '').trim()).filter(Boolean) : [];

    // Normalizer: decode % encodings, convert + to space, collapse whitespace
    const normalizeName = (v) => {
      if (typeof v !== 'string') return '';
      let s = v;
      try { s = decodeURIComponent(s); } catch {}
      s = s.replace(/\+/g, ' ');
      s = s.replace(/\s+/g, ' ').trim();
      return s;
    };

    // If no explicit selection provided, auto-pick top areas from last 12 months
    if (areaList.length === 0 && districtList.length === 0) {
      try {
        const since = new Date();
        since.setMonth(since.getMonth() - 12);
        const topAreas = await MarketSample.aggregate([
          { $match: { createdAt: { $gte: since }, area: { $exists: true, $ne: '' }, rent: { $gt: 0 } } },
          { $group: { _id: '$area', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 6 }
        ]);
        areaList = topAreas.map(a => a._id);
        console.log('Auto-selected popular areas for compare:', areaList);
      } catch (e) {
        console.warn('Failed to compute popular areas fallback:', e?.message || e);
      }
    }

  // Prepare normalized lists for matching
  const normList = (arr) => arr.map(normalizeName).map(s => s.toLowerCase());
  const normAreas = normList(areaList);
  const normDistricts = normList(districtList);

  // Build non-location filters for scraped data
  const match = {};
  match.rent = { ...(match.rent || {}), $gt: 0 };

  // Property type filter
  if (propertyType) {
    match.propertyType = { $in: Array.isArray(propertyType) ? propertyType : [propertyType] };
  }
  // Numeric filters for MarketSample
  if (bedroomsMin || bedroomsMax) {
    match.bedrooms = {};
    if (bedroomsMin) match.bedrooms.$gte = Number(bedroomsMin);
    if (bedroomsMax) match.bedrooms.$lte = Number(bedroomsMax);
    }
    // Support exact rooms by mapping `rooms` to min/max when present
    let rMin = roomsMin, rMax = roomsMax;
    if (rooms) { rMin = rooms; rMax = rooms; }
    if (rMin || rMax) {
      match.rooms = {};
      if (rMin) match.rooms.$gte = Number(rMin);
      if (rMax) match.rooms.$lte = Number(rMax);
    }
    // Note: Skip areaSqft filter as the scraped data doesn't have this field consistently
    if (sqftMin || sqftMax) {
      // MarketSample uses areaSqft when available
      match.areaSqft = {};
      if (sqftMin) match.areaSqft.$gte = Number(sqftMin);
      if (sqftMax) match.areaSqft.$lte = Number(sqftMax);
    }
    // Fix propertyType filter - normalize and map to actual data values in scraped dataset
    if (propertyType) {
      const normalizeType = (v) => (v || '').toString().trim().toLowerCase();
      const key = normalizeType(propertyType);
      console.log('Property type mapping: input =', propertyType, 'normalized =', key);
      // Accept common synonyms/typos
      const typeMap = {
        'apartment': ['Apartment', 'Flat', 'Family', 'Appartment'],
        'appartment': ['Apartment', 'Flat', 'Family', 'Appartment'],
        'room': ['Room', 'Bachelor'],
        'bachelor': ['Bachelor', 'Room'],
        'sublet': ['Sublet'],
        'commercial': ['Commercial', 'Office', 'Shop'],
        'hostel': ['Hostel'],
        'family': ['Family']
      };
      const actualTypes = typeMap[key] || [propertyType];
      console.log('Mapped property types:', actualTypes);
      match.propertyType = { $in: actualTypes };
    }
    
  console.log('Final non-location filter:', JSON.stringify(match, null, 2));
    
  const dateFormat = period === 'year' ? '%Y' : '%Y-%m';

    // Helper to generate pipelines with optional time window
    const withSince = (cond, includeSince) => (includeSince ? { ...cond, createdAt: { $gte: since } } : { ...cond });

    // MarketSample pipeline (scraped data)
    const marketPipeline = (includeSince = true) => ([
      { $match: withSince(match, includeSince) },
      // Add normalized keys for location matching
      ...(normAreas.length || normDistricts.length ? [
        { $addFields: {
          _normArea: { $toLower: { $trim: { input: { $ifNull: ['$area', ''] } } } },
          _normDistrict: { $toLower: { $trim: { input: { $ifNull: ['$district', ''] } } } }
        }},
        { $match: { $or: [
          ...(normAreas.length ? [{ _normArea: { $in: normAreas } }] : []),
          ...(normDistricts.length ? [{ _normDistrict: { $in: normDistricts } }] : [])
        ] } }
      ] : []),
      {
        $addFields: {
          period: { $dateToString: { format: dateFormat, date: '$createdAt' } }
        }
      },
      {
        $group: {
          _id: { period: '$period', area: '$area', district: '$district' },
          avgRent: { $avg: '$rent' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          period: '$_id.period',
          area: '$_id.area',
          district: '$_id.district',
          avgRent: { $round: ['$avgRent', 0] },
          count: 1,
          source: 'scraped',
          _id: 0
        }
      },
      { $sort: { period: 1, location: 1 } }
    ]);

  // Listing pipeline (user listings) — map filters accordingly
  const listingMatch = {};
  if (propertyType) {
    // Normalize for Listing.type as schema enum uses capitalized values
    const key = (propertyType || '').toString().trim().toLowerCase();
    const mapListing = {
      'for rent': 'For Rent',
      'for sale': 'For Sale'
    };
    // map both MarketSample.propertyType and Listing.type to the normalized value
    const mappedType = mapListing[key] || propertyType;
    listingMatch.propertyType = mappedType;
    listingMatch.type = mappedType;
  }
  // Ensure valid price for user listings
  listingMatch.price = { ...(listingMatch.price || {}), $gt: 0 };
    // Use the normalized rMin/rMax for Listing as well
    if (rMin || rMax) {
      listingMatch.rooms = {};
      if (rMin) listingMatch.rooms.$gte = Number(rMin);
      if (rMax) listingMatch.rooms.$lte = Number(rMax);
    }
    if (sqftMin || sqftMax) {
      listingMatch.sizeSqft = {};
      if (sqftMin) listingMatch.sizeSqft.$gte = Number(sqftMin);
      if (sqftMax) listingMatch.sizeSqft.$lte = Number(sqftMax);
    }
    // bedrooms do not exist on Listing schema; ignore for Listing

    const listingPipeline = (includeSince = true) => ([
      { $match: withSince(listingMatch, includeSince) },
      ...(normAreas.length || normDistricts.length ? [
        { $addFields: {
          _normArea: { $toLower: { $trim: { input: { $ifNull: ['$area', ''] } } } },
          _normDistrict: { $toLower: { $trim: { input: { $ifNull: ['$district', ''] } } } }
        }},
        { $match: { $or: [
          ...(normAreas.length ? [{ _normArea: { $in: normAreas } }] : []),
          ...(normDistricts.length ? [{ _normDistrict: { $in: normDistricts } }] : [])
        ] } }
      ] : []),
      {
        $addFields: {
          period: { $dateToString: { format: dateFormat, date: '$createdAt' } }
        }
      },
      {
        $group: {
          _id: { period: '$period', area: '$area', district: '$district' },
          avgRent: { $avg: '$price' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          period: '$_id.period',
          area: '$_id.area',
          district: '$_id.district',
          location: {
            $cond: {
              if: { $and: [ { $ne: ['$_id.area', null] }, { $ne: ['$_id.area', ''] } ] },
              then: '$_id.area',
              else: '$_id.district'
            }
          },
          avgRent: { $round: ['$avgRent', 0] },
          count: 1,
          source: 'listings',
          _id: 0
        }
      },
      { $sort: { period: 1, location: 1 } }
    ]);

    // Fetch datasets depending on source
    let marketData = [];
    let listingData = [];
    if (source === 'scraped') {
      marketData = await MarketSample.aggregate(marketPipeline(true));
    } else if (source === 'listings') {
      listingData = await Listing.aggregate(listingPipeline(true));
    } else {
      // combined
      [marketData, listingData] = await Promise.all([
        MarketSample.aggregate(marketPipeline(true)),
        Listing.aggregate(listingPipeline(true))
      ]);
    }

    // Fallback: if no data found in recent window, re-run without date restriction (all-time)
    const noData = (!marketData || marketData.length === 0) && (!listingData || listingData.length === 0);
    if (noData) {
      console.warn('Compare trends: no data in recent window, broadening search to all-time.', { areas: areaList, districts: districtList, source, period });
      if (source === 'scraped') {
        marketData = await MarketSample.aggregate(marketPipeline(false));
      } else if (source === 'listings') {
        listingData = await Listing.aggregate(listingPipeline(false));
      } else {
        [marketData, listingData] = await Promise.all([
          MarketSample.aggregate(marketPipeline(false)),
          Listing.aggregate(listingPipeline(false))
        ]);
      }
    }

    // Merge: for same period+location, compute weighted average by counts
    const map = new Map();
    const keyOf = (r) => `${r.period}|${r.location}`;
    const addRec = (r, priceField = 'avgRent') => {
      const key = keyOf(r);
      const priceValue = r[priceField];
      if (!Number.isFinite(priceValue)) {
        console.warn('Invalid price value:', priceValue, 'for field:', priceField, 'in record:', r);
        return; // Skip records with invalid price values
      }
      
      if (!map.has(key)) {
        const total = priceValue * r.count;
        map.set(key, { period: r.period, location: r.location, total, count: r.count });
      } else {
        const cur = map.get(key);
        cur.total += priceValue * r.count;
        cur.count += r.count;
      }
    };
  marketData.forEach(r => addRec(r, 'avgRent'));
  listingData.forEach(r => addRec(r, 'avgRent'));

    // Transform to grouped object { location: [{period, avgRent, count}], ... }
    const groupedData = {};
    for (const [, v] of map) {
      const avg = v.count ? Math.round(v.total / v.count) : null;
      if (!groupedData[v.location]) groupedData[v.location] = [];
      groupedData[v.location].push({ period: v.period, avgRent: avg, count: v.count });
    }
    // sort arrays by period
    Object.values(groupedData).forEach(arr => arr.sort((a, b) => (a.period > b.period ? 1 : -1)));

  res.json({ success: true, data: groupedData, period, appliedFilters: { source, bedroomsMin, bedroomsMax, roomsMin: rMin, roomsMax: rMax, propertyType, sqftMin, sqftMax } });
  } catch (err) {
    console.error('Trends compare error', err);
    res.status(500).json({ error: 'Failed to fetch comparison data', message: err?.message || String(err) });
  }
});

// Get heatmap-ready aggregated data: per-district average rent + centroid (lat/lng)
router.get('/trends/heatmap', async (req, res) => {
  try {
    const { period = 'month', propertyType, minBudget, maxBudget } = req.query;

    // Aggregate avg rent per district from both MarketSample (scraped) and Listing (user data)
    const dateFormat = period === 'year' ? '%Y' : '%Y-%m';

    // Build match conditions for filters
    const match = {};
    if (propertyType) match.propertyType = propertyType;
    if (minBudget || maxBudget) {
      match.rent = {};
      if (minBudget) match.rent.$gte = Number(minBudget);
      if (maxBudget) match.rent.$lte = Number(maxBudget);
    }

    // Pipeline for MarketSample
    const marketPipeline = [
      { $match: match },
      {
        $addFields: {
          period: { $dateToString: { format: dateFormat, date: '$createdAt' } }
        }
      },
      {
        $group: {
          _id: { district: '$district' },
          avgRent: { $avg: '$rent' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          district: '$_id.district',
          avgRent: { $round: ['$avgRent', 0] },
          count: 1,
          source: 'scraped',
          _id: 0
        }
      }
    ];

    // For Listing, use price instead of rent, and type instead of propertyType
    const listingMatch = {};
    if (propertyType) listingMatch.type = propertyType;
    if (minBudget || maxBudget) {
      listingMatch.price = {};
      if (minBudget) listingMatch.price.$gte = Number(minBudget);
      if (maxBudget) listingMatch.price.$lte = Number(maxBudget);
    }

    // Pipeline for Listing
    const listingPipeline = [
      { $match: { ...listingMatch, district: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: { district: '$district' },
          avgRent: { $avg: '$price' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          district: '$_id.district',
          avgRent: { $round: ['$avgRent', 0] },
          count: 1,
          source: 'listings',
          _id: 0
        }
      }
    ];

    const [marketAgg, listingAgg] = await Promise.all([
      MarketSample.aggregate(marketPipeline),
      Listing.aggregate(listingPipeline)
    ]);

    // Combine results, preferring scraped if both exist
    const combined = {};
    marketAgg.forEach(item => {
      combined[item.district] = item;
    });
    listingAgg.forEach(item => {
      if (!combined[item.district]) {
        combined[item.district] = item;
      } else {
        // Combine counts and average rents
        const totalCount = combined[item.district].count + item.count;
        const weightedAvg = (combined[item.district].avgRent * combined[item.district].count + item.avgRent * item.count) / totalCount;
        combined[item.district].avgRent = Math.round(weightedAvg);
        combined[item.district].count = totalCount;
        combined[item.district].source = 'combined';
      }
    });

    const agg = Object.values(combined);

    // For each area attempt to compute centroid from Listing documents (which may have lat/lng)
    const results = [];

    // small fallback map of well-known area/district centroids (approximate)
    const AREA_COORDS = {
      'dhanmondi': { lat: 23.7465, lng: 90.3775 },
      'gulshan': { lat: 23.7929, lng: 90.4145 },
      'mirpur': { lat: 23.8256, lng: 90.3560 },
      'uttara': { lat: 23.8739, lng: 90.3790 },
      'tejgaon': { lat: 23.7542, lng: 90.3984 },
      'motijheel': { lat: 23.7235, lng: 90.4156 },
      'kotwali': { lat: 23.7104, lng: 90.4091 },
      'gazipur': { lat: 23.9996, lng: 90.4066 },
      'narayanganj': { lat: 23.6236, lng: 90.5000 },
      'chattogram': { lat: 22.3569, lng: 91.7832 },
      'rajshahi': { lat: 24.3745, lng: 88.6042 },
      'khulna': { lat: 22.8456, lng: 89.5403 },
      'barishal': { lat: 22.7010, lng: 90.3535 },
      'sylhet': { lat: 24.8949, lng: 91.8687 },
      'rangpur': { lat: 25.7439, lng: 89.2752 },
      'mymensingh': { lat: 24.7471, lng: 90.4203 }
    };

    // Normalize keys helper
    const norm = (s) => (s || '').toString().trim().toLowerCase();

    for (const row of agg) {
      const districtName = row.district || 'Unknown';
      // try to find a few listings with lat/lng in Listing collection
      const docs = await Listing.find({ district: districtName, $or: [{ lat: { $exists: true } }, { location: { $exists: true } }] })
        .limit(200)
        .select('lat lng location')
        .lean();

      const coords = docs.map((d) => {
        const lat = (typeof d.lat === 'number') ? d.lat : (d.location && Array.isArray(d.location.coordinates) ? d.location.coordinates[1] : null);
        const lng = (typeof d.lng === 'number') ? d.lng : (d.location && Array.isArray(d.location.coordinates) ? d.location.coordinates[0] : null);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        return null;
      }).filter(Boolean);

      let centroid = null;
      if (coords.length > 0) {
        const meanLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
        const meanLng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
        centroid = { lat: meanLat, lng: meanLng, samples: coords.length, source: 'listings' };
      } else {
        // fallback: try matching district name to known approximate coordinates using fuzzy matching
        const dkey = norm(districtName);
        // direct exact key
        if (AREA_COORDS[dkey]) {
          centroid = { lat: AREA_COORDS[dkey].lat, lng: AREA_COORDS[dkey].lng, samples: 0, source: 'fallback-district' };
        } else {
          // try substring matches: if district name contains a known key or vice versa
          const foundKey = Object.keys(AREA_COORDS).find((k) => dkey.includes(k) || k.includes(dkey) || dkey.replace(/[^a-z0-9]/g, '').includes(k.replace(/[^a-z0-9]/g, '')));
          if (foundKey) {
            centroid = { lat: AREA_COORDS[foundKey].lat, lng: AREA_COORDS[foundKey].lng, samples: 0, source: 'fallback-district-fuzzy' };
          }
        }
      }

      results.push({ district: districtName, avgRent: row.avgRent, count: row.count, centroid });
    }

    res.json({ success: true, data: results, period });
  } catch (err) {
    console.error('Heatmap aggregation error', err);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

// --------------------------------------------------
// REPORT LISTINGS ENDPOINTS
// --------------------------------------------------

// Create a new report (accepts multipart for proof uploads)
router.post(
  '/reports',
  authenticate,
  upload.array('proof', 10),
  async (req, res) => {
    try {
      // Support both JSON and multipart forms
      const {
        listingId,
        userId,
        reportType,
        reason,
        message,
        listingTitle,
        userName,
      } = req.body || {};

      const reporterId = (req.auth && req.auth.userId) || getUserId(req);

      if (!reason) {
        return res.status(400).json({ error: 'Reason is required' });
      }

      if (!reporterId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      const base = `${req.protocol}://${req.get('host')}`;
      const proofUrls = (req.files || []).map((f) => `${base}/uploads/${f.filename}`);

      // Validate report type and target (accept ID or title/name)
      if (reportType === 'listing') {
        if (!listingId && !listingTitle) {
          return res.status(400).json({ error: 'Listing ID or title is required for listing reports' });
        }

        if (listingId) {
          // Check if listing exists when ID provided
          const listing = await Listing.findById(listingId);
          if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
          }
          // Duplicate check by listingId
          const existingReport = await Report.findOne({
            listingId,
            reporterId,
            status: { $in: ['pending', 'under_review'] },
          });
          if (existingReport) {
            return res.status(409).json({ error: 'You have already reported this listing' });
          }
        } else if (listingTitle) {
          // Duplicate check by listingTitle
          const existingReport = await Report.findOne({
            listingTitle: listingTitle.trim(),
            reporterId,
            status: { $in: ['pending', 'under_review'] },
          });
          if (existingReport) {
            return res.status(409).json({ error: 'You have already reported a listing with this title' });
          }
        }
      } else if (reportType === 'user') {
        if (!userId && !userName) {
          return res.status(400).json({ error: 'User ID or name is required for user reports' });
        }

        if (userId) {
          // Prevent self-reporting only when a concrete userId is provided
          if (userId === reporterId) {
            return res.status(400).json({ error: 'You cannot report yourself' });
          }
          // Duplicate check by userId
          const existingReport = await Report.findOne({
            userId,
            reporterId,
            status: { $in: ['pending', 'under_review'] },
          });
          if (existingReport) {
            return res.status(409).json({ error: 'You have already reported this user' });
          }
        } else if (userName) {
          // Duplicate check by userName
          const existingReport = await Report.findOne({
            userName: userName.trim(),
            reporterId,
            status: { $in: ['pending', 'under_review'] },
          });
          if (existingReport) {
            return res.status(409).json({ error: 'You have already reported a user with this name' });
          }
        }
      } else {
        return res.status(400).json({ error: 'Invalid report type. Must be "listing" or "user"' });
      }

      const report = new Report({
        listingId: reportType === 'listing' ? listingId : undefined,
        listingTitle: reportType === 'listing' ? (listingTitle ? listingTitle.trim() : undefined) : undefined,
        userId: reportType === 'user' ? userId : undefined,
        userName: reportType === 'user' ? (userName ? userName.trim() : undefined) : undefined,
        reporterId,
        reportType: reportType || 'listing',
        reason,
        message: message || '',
        proofUrls,
      });

      await report.save();

      res.status(201).json({
        message: 'Report submitted successfully',
        report: {
          id: report._id,
          status: report.status,
          createdAt: report.createdAt,
        },
      });
    } catch (err) {
      console.error('Report creation error:', err);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  }
);

// Get reports for admin (with pagination and filters)
router.get('/reports', requireRole('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      reason,
      reportType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

  // Build query, ignoring empty strings
  const query = {};
  if (status && typeof status === 'string' && status.trim()) query.status = status.trim();
  if (reason && typeof reason === 'string' && reason.trim()) query.reason = reason.trim();
  if (reportType && (reportType === 'listing' || reportType === 'user')) query.reportType = reportType;

  // Pagination & sorting safety
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;
  const allowedSorts = new Set(['createdAt', 'status', 'reason']);
  const sortField = allowedSorts.has(sortBy) ? sortBy : 'createdAt';
  const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    // Fetch reports lean, then safely join listing details only for valid ObjectIds
    const reports = await Report.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();
    let enriched = reports;
    try {
      const idStrings = reports
        .map(r => {
          try { return r.listingId != null ? r.listingId.toString() : null; } catch { return null; }
        })
        .filter(v => typeof v === 'string' && v.length > 0 && mongoose.Types.ObjectId.isValid(v));

      let listingsById = new Map();
      if (idStrings.length) {
        const listingDocs = await Listing.find({ _id: { $in: idStrings } })
          .select('title district area price type userId')
          .lean();
        listingsById = new Map(listingDocs.map(d => [d._id.toString(), d]));
      }

      enriched = reports.map(r => {
        let idStr = null;
        try { idStr = r.listingId != null ? r.listingId.toString() : null; } catch {}
        if (idStr && listingsById.has(idStr)) {
          return { ...r, listingId: listingsById.get(idStr) };
        }
        return { ...r, listingId: null };
      });
    } catch (joinErr) {
      // If any join error occurs, fall back to raw reports without listing details
      console.warn('Reports join warning:', joinErr?.message || joinErr);
      enriched = reports.map(r => ({ ...r, listingId: null }));
    }

  const total = await Report.countDocuments(query);
  const totalPages = Math.ceil(total / limitNum);

    // Debug log for observability
    console.log('[ADMIN reports] query:', query, 'page:', pageNum, 'limit:', limitNum, 'sort:', sort);
    console.log('[ADMIN reports] result count:', enriched.length, 'total:', total, 'pages:', totalPages);

    res.json({
  reports: enriched,
      pagination: {
    page: pageNum,
        pages: totalPages,
        total,
    limit: limitNum
      }
    });
  } catch (err) {
  console.error('Get reports error:', err);
  res.status(500).json({ error: 'Failed to fetch reports', message: err?.message || String(err) });
  }
});

// Update report status (admin only)
router.put('/reports/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminAction, adminNotes } = req.body;
    const adminId = getUserId(req);

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update report
    report.status = status || report.status;
    report.adminAction = adminAction || report.adminAction;
    report.adminNotes = adminNotes || report.adminNotes;
    report.reviewedBy = adminId;
    report.reviewedAt = new Date();

    await report.save();

    // If admin action is to remove listing, update the listing
    if (adminAction === 'listing_removed') {
      await Listing.findByIdAndUpdate(report.listingId, { isRented: true });
    }

    res.json({
      message: 'Report updated successfully',
      report
    });
  } catch (err) {
  console.error('Update report error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Get reports for a specific listing
router.get('/reports/listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = getUserId(req);

    // Only allow users to see their own reports or admins to see all
    const query = { listingId };
    if (!req.user?.role?.includes('admin')) {
      query.reporterId = userId;
    }

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .select('reason message status adminAction createdAt reviewedAt');

    res.json({ reports });
  } catch (err) {
    console.error('Get listing reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get report statistics for admin dashboard
router.get('/reports/stats', requireRole('admin'), async (req, res) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    res.json({
      total: totalReports,
      pending: pendingReports,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('Get report stats error:', err);
    res.status(500).json({ error: 'Failed to fetch report statistics' });
  }
});

// Create a new report (requires authentication)
router.post('/reports', authenticate, upload.array('proof', 5), async (req, res) => {
  try {
  const { reportType, reason, message, listingTitle, userName } = req.body;
  // Optional IDs passed from listing details flow
  const listingIdRaw = (req.body.listingId || '').toString().trim();
  const reportedUserIdRaw = (req.body.userId || '').toString().trim();
    const reporterId = req.auth.userId;

    // Validate required fields
    if (!reportType || !reason) {
      return res.status(400).json({ error: 'Report type and reason are required' });
    }

    // Allow listing reports with either listingId or listingTitle
    if (reportType === 'listing' && (!listingTitle && !(listingIdRaw && mongoose.Types.ObjectId.isValid(listingIdRaw)))) {
      return res.status(400).json({ error: 'Provide listingId or listing title for listing reports' });
    }

    // Allow user reports with either userId or userName
    if (reportType === 'user' && (!userName && !reportedUserIdRaw)) {
      return res.status(400).json({ error: 'Provide userId or user name for user reports' });
    }

    // Validate report type
    if (!['listing', 'user'].includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // Validate reason
    const validReasons = [
      'misleading', 'spammy', 'offensive', 'inappropriate', 'fraudulent', 'duplicate',
      'harassment', 'spam_account', 'fake_account', 'inappropriate_behavior', 'scam_attempt',
      'other'
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    // If listingId provided, try to fetch listing to auto-fill title and owner
    let listingDoc = null;
    if (listingIdRaw && mongoose.Types.ObjectId.isValid(listingIdRaw)) {
      try {
        listingDoc = await Listing.findById(listingIdRaw).select('title userId');
      } catch {}
    }

    // Handle proof files
    const base = `${req.protocol}://${req.get('host')}`;
    const proofUrls = (req.files || []).map((file) => `${base}/uploads/${file.filename}`);

    // Create the report
    const reportPayload = {
      reportType,
      reason,
      message: message || '',
      reporterId,
      proofUrls
    };

    if (reportType === 'listing') {
      if (listingDoc) {
        reportPayload.listingId = listingDoc._id;
        reportPayload.listingTitle = listingDoc.title || listingTitle || '';
        if (listingDoc.userId) reportPayload.userId = listingDoc.userId;
      } else {
        // fallback to passed values
        if (listingIdRaw && mongoose.Types.ObjectId.isValid(listingIdRaw)) reportPayload.listingId = listingIdRaw;
        reportPayload.listingTitle = listingTitle || '';
        if (reportedUserIdRaw) reportPayload.userId = reportedUserIdRaw;
      }
    } else if (reportType === 'user') {
      reportPayload.userName = userName || '';
      if (reportedUserIdRaw) reportPayload.userId = reportedUserIdRaw;
    }

    const report = new Report(reportPayload);

    const savedReport = await report.save();

    res.status(201).json({
      message: 'Report submitted successfully',
      report: savedReport
    });

  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Get user's own reports
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const reporterId = req.auth.userId;

    if (!reporterId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const reports = await Report.find({ reporterId })
      .populate({
        path: 'listingId',
        select: 'title district area price type'
      })
      .sort({ createdAt: -1 });

    // Transform the reports to include the appropriate title/name
    const transformedReports = reports.map(report => ({
      ...report.toObject(),
      targetTitle: report.reportType === 'listing' 
        ? (report.listingId?.title || report.listingTitle || 'Unknown Listing')
        : (report.userName || 'Unknown User'),
      targetName: report.reportType === 'user' 
        ? (report.userName || 'Unknown User')
        : (report.listingId?.title || report.listingTitle || 'Unknown Listing')
    }));

    res.json(transformedReports);
  } catch (err) {
    console.error('Get my reports error:', err);
    res.status(500).json({ error: 'Failed to fetch your reports' });
  }
});

module.exports = router;
