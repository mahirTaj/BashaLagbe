const express = require('express');
const router = express.Router();
const Listing = require('../models/listings');
const mongoose = require('mongoose');
const MarketSample = require('../models/MarketSample');
const Report = require('../models/Report');
const multer = require('multer');
const cloudinaryLib = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const { authenticate, requireRole } = require('../middleware/auth');

// --------------------------------------------------
// URL rewriting helpers to prevent mixed-content (http assets on https page)
// --------------------------------------------------
function effectiveProtocol(req) {
  if (req.protocol === 'https') return 'https';
  const xf = req.headers['x-forwarded-proto'];
  if (xf) return xf.split(',')[0].trim();
  return req.protocol || 'http';
}
function rewriteAssetUrl(req, url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const host = req.get('host');
    const proto = effectiveProtocol(req);
    // Convert absolute local uploads URL to relative form to avoid protocol mismatch
    const localPattern = new RegExp(`^https?:\\/\\/${host}\\/uploads\\/`);
    if (localPattern.test(url)) {
      return url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '/'); // ensure single leading slash
    }
    // Force https for same-host http URLs when current request is https
    if (proto === 'https') {
      return url.replace(new RegExp(`^http://${host}`), `https://${host}`);
    }
    return url;
  } catch {
    return url;
  }
}
function deepRewriteMedia(req, body) {
  if (!body) return body;
  if (Array.isArray(body)) return body.map(item => deepRewriteMedia(req, item));
  if (typeof body === 'object') {
    if (Array.isArray(body.photoUrls)) {
      body.photoUrls = body.photoUrls.map(u => rewriteAssetUrl(req, u));
    }
    if (body.videoUrl) body.videoUrl = rewriteAssetUrl(req, body.videoUrl);
    // Recurse shallow nested objects
    for (const k of Object.keys(body)) {
      const v = body[k];
      if (v && typeof v === 'object') deepRewriteMedia(req, v);
    }
  }
  return body;
}

// Patch res.json within this router to sanitize media URLs before sending to client
router.use((req, res, next) => {
  const orig = res.json;
  res.json = function (data) {
    try { data = deepRewriteMedia(req, data); } catch {}
    return orig.call(this, data);
  };
  next();
});

// --------------------------------------------------
// Helpers & upload config
// --------------------------------------------------
function getUserId(req) {
  return (req.headers['x-user-id'] || req.query.userId || '').toString();
}

// Map common deal type inputs (rent/sale) to schema values 'For Rent' | 'For Sale'
function mapDealType(input) {
  if (!input && input !== 0) return null;
  const raw = input.toString().trim().toLowerCase();
  if (!raw) return null;
  const rent = new Set(['rent', 'for rent', 'rental', 'rentals', 'for_rent', 'to let', 'to_let', 'let']);
  const sale = new Set(['sale', 'sell', 'for sale', 'for_sale', 'selling', 'sellings']);
  if (rent.has(raw)) return 'For Rent';
  if (sale.has(raw)) return 'For Sale';
  // accept already-formatted
  if (raw === 'for rent') return 'For Rent';
  if (raw === 'for sale') return 'For Sale';
  return null;
}

// Validate if a string is one of the Listing.type categories
function isListingCategory(value) {
  const v = (value || '').toString().trim();
  if (!v) return false;
  const allowed = new Set(['Apartment', 'Room', 'Sublet', 'Commercial', 'Hostel']);
  return allowed.has(v) || allowed.has(v.charAt(0).toUpperCase() + v.slice(1).toLowerCase());
}

// Optional Cloudinary integration (if env configured) for public CDN URLs
const useCloudinary = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (useCloudinary) {
  try {
    if (process.env.CLOUDINARY_URL) {
      // When CLOUDINARY_URL is set, config() will read from env; secure ensures https URLs
      cloudinaryLib.config({ secure: true });
    } else {
      cloudinaryLib.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  } catch (e) {
    // If misconfigured, fall back to local storage
    console.error('Cloudinary config error, falling back to local uploads:', e?.message || e);
  }
}

const storage = useCloudinary
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
      filename: (req, file, cb) => {
        const safe = (file.originalname || 'file').replace(/\s+/g, '_');
        cb(null, `${Date.now()}_${safe}`);
      },
    });
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Helpers to map a stored URL to a local uploads file path and delete safely
const uploadsDir = path.join(__dirname, '..', 'uploads');
async function cloudinaryUploadFromBuffer(fileBuffer, originalname, folder) {
  return new Promise((resolve, reject) => {
    const publicId = (originalname || 'file').replace(/\.[^.]+$/, '').replace(/\s+/g, '_');
    const uploadStream = cloudinaryLib.uploader.upload_stream(
      { resource_type: 'auto', folder, public_id: `${Date.now()}_${publicId}` },
      (err, result) => {
        if (err) return reject(err);
        resolve(result?.secure_url || result?.url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}
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

// Ensure legacy local URLs (e.g., http://localhost:5000/uploads/...) are rewritten
// to the current server host so images load in any environment.
function normalizeLocalUrl(req, url) {
  if (!url) return url;
  try {
    // Only rewrite if it references our static uploads path
    const marker = '/uploads/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    
    // Get the current request's protocol and host
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const pathPart = url.substring(idx); // includes /uploads/...
    
    // Return full URL with current protocol and host
    return `${protocol}://${host}${pathPart}`;
  } catch {
    return url;
  }
}
function normalizeLocalUrls(req, urls) {
  if (!Array.isArray(urls)) return urls;
  return urls.map((u) => normalizeLocalUrl(req, u));
}

// Create listing (requires authenticated owner)
router.post('/', authenticate, upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
  // prefer token user, fall back to legacy header for non-auth clients
    const userId = (req.auth && req.auth.userId) || getUserId(req);
    if (!userId) return res.status(401).json({ error: 'userId required (authenticate or provide x-user-id)' });

  const base = `${req.protocol}://${req.get('host')}`;
  let photoUrls = [];
  let videoUrl = '';
  if (useCloudinary) {
    // Upload to Cloudinary for public access
    const photos = req.files?.photos || [];
    photoUrls = await Promise.all(photos.map((f) => cloudinaryUploadFromBuffer(f.buffer, f.originalname, 'basha-lagbe/photos')));
    if (req.files?.video?.[0]) {
      videoUrl = await cloudinaryUploadFromBuffer(req.files.video[0].buffer, req.files.video[0].originalname, 'basha-lagbe/videos');
    }
  } else {
    // Local storage fallback (/uploads served statically)
    photoUrls = (req.files?.photos || []).map((f) => `${base}/uploads/${f.filename}`);
    videoUrl = req.files?.video?.[0] ? `${base}/uploads/${req.files.video[0].filename}` : '';
  }

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
    res.status(500).json({ error: err.message });
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
        photo: normalizeLocalUrl(req, d.photoUrls?.[0] || ''),
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
        photo: normalizeLocalUrl(req, d.photoUrls?.[0] || ''),
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
    const listings = await Listing.find({ userId }).sort({ createdAt: -1 }).lean();
    const normalized = listings.map((d) => ({
      ...d,
      photoUrls: normalizeLocalUrls(req, d.photoUrls || []),
      videoUrl: normalizeLocalUrl(req, d.videoUrl || ''),
    }));
    res.json(normalized);
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
  try {
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

    const [data, total] = await Promise.all([
      Listing.find(filter).sort(sortOpt).skip(skip).limit(limitNum).lean(),
      Listing.countDocuments(filter),
    ]);

    // Normalize any legacy local media URLs to the current host
    const normalized = data.map((d) => ({
      ...d,
      photoUrls: normalizeLocalUrls(req, d.photoUrls || []),
      videoUrl: normalizeLocalUrl(req, d.videoUrl || ''),
    }));

    res.json({
      data: normalized,
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
router.get('/:id', async (req, res, next) => {
  try {
    // Only handle valid ObjectId IDs here; otherwise let other routes (e.g., '/reports') match
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next();
  const doc = await Listing.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  doc.photoUrls = normalizeLocalUrls(req, doc.photoUrls || []);
  doc.videoUrl = normalizeLocalUrl(req, doc.videoUrl || '');
  res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update listing (only by owner)
router.put('/:id', authenticate, upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
  const userId = (req.auth && req.auth.userId) || getUserId(req);
    if (!userId) return res.status(401).json({ error: 'userId required' });

    const doc = await Listing.findOne({ _id: req.params.id, userId });
    if (!doc) return res.status(404).json({ error: 'Not found or not owner' });

    const base = `${req.protocol}://${req.get('host')}`;
    let newPhotoUrls = [];
    if (useCloudinary) {
      const photos = req.files?.photos || [];
      newPhotoUrls = await Promise.all(photos.map((f) => cloudinaryUploadFromBuffer(f.buffer, f.originalname, 'basha-lagbe/photos')));
    } else {
      newPhotoUrls = (req.files?.photos || []).map((f) => `${base}/uploads/${f.filename}`);
    }
    const keep = req.body.existingPhotoUrls ? JSON.parse(req.body.existingPhotoUrls) : doc.photoUrls || [];

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
  // location removed
  // Structured address updates
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
  if (typeof req.body.negotiable !== 'undefined') doc.negotiable = req.body.negotiable === 'true' || req.body.negotiable === true;
  if (typeof req.body.utilitiesIncluded !== 'undefined') doc.utilitiesIncluded = req.body.utilitiesIncluded.split(',').map((s) => s.trim()).filter(Boolean);
  if (typeof req.body.contactName !== 'undefined') doc.contactName = req.body.contactName;
  if (typeof req.body.phone !== 'undefined') doc.phone = req.body.phone;
  if (typeof req.body.sizeSqft !== 'undefined') doc.sizeSqft = Number(req.body.sizeSqft) || 0;

    // Optional geo updates within Bangladesh
    if (typeof req.body.lat !== 'undefined' && typeof req.body.lng !== 'undefined') {
      const lat = Number(req.body.lat);
      const lng = Number(req.body.lng);
      const inRange = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 20.5 && lat <= 26.7 && lng >= 88 && lng <= 92.7;
      if (inRange) {
        doc.lat = lat; doc.lng = lng;
        doc.location = { type: 'Point', coordinates: [lng, lat] };
      }
    }

    doc.photoUrls = [...keep, ...newPhotoUrls];
    let removedVideoUrl = '';
    if (req.files?.video?.[0]) {
      // Replace with newly uploaded video
      removedVideoUrl = originalVideoUrl;
      if (useCloudinary) {
        doc.videoUrl = await cloudinaryUploadFromBuffer(req.files.video[0].buffer, req.files.video[0].originalname, 'basha-lagbe/videos');
      } else {
        doc.videoUrl = `${base}/uploads/${req.files.video[0].filename}`;
      }
    } else if (req.body.removeVideo === 'true') {
      // Explicitly remove existing video
      removedVideoUrl = originalVideoUrl;
      doc.videoUrl = '';
    } else if (req.body.existingVideoUrl) {
      // Keep existing video when the client confirms it should remain
      doc.videoUrl = req.body.existingVideoUrl;
    }

    // Validate required fields after applying changes
    const must = {
      title: doc.title,
      price: doc.price,
      type: doc.type,
      floor: doc.floor,
      rooms: doc.rooms,
      availableFrom: doc.availableFrom,
      division: doc.division,
      district: doc.district,
      subdistrict: doc.subdistrict,
      area: doc.area,
      phone: doc.phone,
    };
    const missing = Object.entries(must).filter(([k, v]) => {
      if (k === 'floor') return !(typeof v === 'number') || v < 0;
      if (k === 'rooms') return !(typeof v === 'number') || v < 0;
      return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    }).map(([k]) => k);
    if (!doc.photoUrls.length) missing.push('photos');
    if (missing.length) return res.status(400).json({ error: 'Missing required fields', fields: missing });

    const updated = await doc.save();

    // After successful save, delete any removed photos/videos from disk (best effort)
    const removedPhotos = originalPhotoUrls.filter((u) => !doc.photoUrls.includes(u));
    const pathsToDelete = [
      ...removedPhotos.map(urlToUploadPath),
      urlToUploadPath(removedVideoUrl),
    ].filter(Boolean);
    // Fire and forget
    Promise.all(pathsToDelete.map(unlinkSafe)).catch(() => {});

  const out = updated.toObject ? updated.toObject() : JSON.parse(JSON.stringify(updated));
  out.photoUrls = normalizeLocalUrls(req, out.photoUrls || []);
  out.videoUrl = normalizeLocalUrl(req, out.videoUrl || '');
  res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// Delete listing (owner only)
// --------------------------------------------------
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = (req.auth && req.auth.userId) || getUserId(req);
    if (!userId) return res.status(401).json({ error: 'userId required' });

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
          location: {
            $cond: {
              if: { $and: [ { $ne: ['$_id.area', null] }, { $ne: ['$_id.area', ''] } ] },
              then: '$_id.area',
              else: '$_id.district'
            }
          },
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
// [Removed] Heatmap endpoint was deprecated and fully removed as per project requirements.

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
      let proofUrls = [];
      if (useCloudinary) {
        proofUrls = await Promise.all((req.files || []).map((f) => cloudinaryUploadFromBuffer(f.buffer, f.originalname, 'basha-lagbe/reports')));
      } else {
        proofUrls = (req.files || []).map((f) => `${base}/uploads/${f.filename}`);
      }

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
    let proofUrls = [];
    if (useCloudinary) {
      proofUrls = await Promise.all((req.files || []).map((f) => cloudinaryUploadFromBuffer(f.buffer, f.originalname, 'basha-lagbe/reports')));
    } else {
      proofUrls = (req.files || []).map((file) => `${base}/uploads/${file.filename}`);
    }

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
