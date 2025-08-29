const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const MarketSample = require('../models/MarketSample');
const MarketStats = require('../models/MarketStats');

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/scraped-data');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Admin authentication middleware (simple for now)
const adminAuth = (req, res, next) => {
  // In a real app, you'd verify JWT tokens here
  // For now, we'll just check for a simple header
  const adminToken = req.headers['admin-token'];
  if (adminToken === 'superadmin-token') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Upload scraped CSV data
router.post('/upload-scraped-data', adminAuth, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const filePath = req.file.path;
    const results = [];
    const validRecords = [];
    const invalidRecords = [];
    let totalRecords = 0;

    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        totalRecords++;
        
        // Validate required fields
        const isValid = validateScrapedRecord(data);
        
        if (isValid.valid) {
          validRecords.push({
            ...data,
            rent: parseInt(data.rent) || 0,
            bedrooms: parseInt(data.bedrooms) || 0,
            bathrooms: parseInt(data.bathrooms) || 0,
            rooms: parseInt(data.rooms) || 0,
            seats: data.seats ? parseInt(data.seats) : (data.seat ? parseInt(data.seat) : 0),
            rent_per_room: data.rent_per_room ? parseInt(data.rent_per_room) : (data.rentPerRoom ? parseInt(data.rentPerRoom) : 0),
            uploadedAt: new Date(),
            status: 'pending_review'
          });
        } else {
          invalidRecords.push({
            ...data,
            issues: isValid.issues,
            status: 'invalid'
          });
        }
      })
      .on('end', () => {
        // Store validation results
        const resultData = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          uploadedAt: new Date(),
          totalRecords,
          validRecords: validRecords.length,
          invalidRecords: invalidRecords.length,
          duplicates: 0, // TODO: Implement duplicate detection
          validData: validRecords,
          invalidData: invalidRecords
        };

        // Save to temporary storage (in production, save to database)
        const resultPath = path.join(__dirname, '../uploads/validation-results', `${Date.now()}-validation.json`);
        fs.mkdirSync(path.dirname(resultPath), { recursive: true });
        fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));

        res.json({
          success: true,
          filename: req.file.originalname,
          totalRecords,
          validRecords: validRecords.length,
          invalidRecords: invalidRecords.length,
          duplicates: 0,
          area: extractAreaFromFilename(req.file.originalname),
          district: extractDistrictFromFilename(req.file.originalname),
          validationId: path.basename(resultPath, '.json')
        });

        // Clean up uploaded file
        fs.unlinkSync(filePath);
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(500).json({ error: 'Failed to parse CSV file' });
      });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Get validation results
router.get('/validation-results/:validationId', adminAuth, (req, res) => {
  try {
    const { validationId } = req.params;
    const resultPath = path.join(__dirname, '../uploads/validation-results', `${validationId}.json`);
    
    if (!fs.existsSync(resultPath)) {
      return res.status(404).json({ error: 'Validation results not found' });
    }

    const results = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    res.json(results);
  } catch (error) {
    console.error('Error fetching validation results:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit validated data to main database
router.post('/submit-validated-data', adminAuth, async (req, res) => {
  try {
    const { validationId, selectedRecordIds } = req.body;
    if (!validationId) {
      return res.status(400).json({ error: 'validationId required' });
    }
    const resultPath = path.join(__dirname, '../uploads/validation-results', `${validationId}.json`);
    if (!fs.existsSync(resultPath)) {
      return res.status(404).json({ error: 'Validation results not found' });
    }
    const fileData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    let toInsert = fileData.validData || [];
    if (Array.isArray(selectedRecordIds) && selectedRecordIds.length) {
      // Assume each record has an implicit index id
      toInsert = toInsert.filter((_, idx) => selectedRecordIds.includes(idx));
    }
    if (!toInsert.length) {
      return res.status(400).json({ error: 'No records selected for insertion' });
    }
    // Map fields to MarketSample schema
    const docs = toInsert.map(r => ({
      title: r.title,
      propertyType: r.property_type || r.propertyType,
      area: r.area,
      district: r.district,
      location: r.location || r.address || '',
      rent: r.rent ? parseInt(r.rent) : 0,
  rentCategory: r.rent_category || r.category || r.rentCategory || '',
      bedrooms: r.bedrooms ? parseInt(r.bedrooms) : undefined,
      rooms: r.rooms ? parseInt(r.rooms) : undefined,
      bathrooms: r.bathrooms ? parseInt(r.bathrooms) : undefined,
  seats: r.seats ? parseInt(r.seats) : undefined,
  rentPerRoom: r.rent_per_room ? parseInt(r.rent_per_room) : (r.rentPerRoom ? parseInt(r.rentPerRoom) : undefined),
      availableFrom: r.available_from || r.availableFrom || '',
      url: r.url || '',
      sourceFile: fileData.originalName,
  scrapedAt: r.scraped_at || r.scrapedAt || '',
  raw: r
    }));
    const inserted = await MarketSample.insertMany(docs);
    res.json({ success: true, inserted: inserted.length });
  } catch (error) {
    console.error('Error submitting validated data:', error);
    res.status(500).json({ error: 'Server error during submission' });
  }
});

// Aggregation endpoint: average rent by area & district (optionally month)
router.get('/analytics/average-rent', adminAuth, async (req, res) => {
  try {
    const { district, area, period } = req.query;
    const match = {};
    if (district) match.district = district;
    if (area) match.area = area;
    let pipeline = [{ $match: match }];
    if (period === 'month') {
      pipeline.push({ $addFields: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } } });
      pipeline.push({ $group: { _id: { district: '$district', area: '$area', month: '$month' }, avgRent: { $avg: '$rent' }, sampleCount: { $sum: 1 } } });
      pipeline.push({ $sort: { '_id.month': 1 } });
    } else {
      pipeline.push({ $group: { _id: { district: '$district', area: '$area' }, avgRent: { $avg: '$rent' }, sampleCount: { $sum: 1 } } });
      pipeline.push({ $sort: { avgRent: -1 } });
    }
    const data = await MarketSample.aggregate(pipeline);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Analytics error', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// District-wise analytics
router.get('/analytics/districts', adminAuth, async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$district',
          properties: { $sum: 1 },
          avgRent: { $avg: '$rent' },
          minRent: { $min: '$rent' },
          maxRent: { $max: '$rent' },
          areas: { $addToSet: '$area' },
          avgBedrooms: { $avg: '$bedrooms' },
          avgBathrooms: { $avg: '$bathrooms' },
          avgRooms: { $avg: '$rooms' }
        }
      },
      {
        $project: {
          district: '$_id',
          properties: 1,
          avgRent: { $round: ['$avgRent', 0] },
          minRent: 1,
          maxRent: 1,
          areaCount: { $size: '$areas' },
          avgBedrooms: { $round: ['$avgBedrooms', 1] },
          avgBathrooms: { $round: ['$avgBathrooms', 1] },
          avgRooms: { $round: ['$avgRooms', 1] }
        }
      },
      { $sort: { properties: -1 } }
    ];
    const data = await MarketSample.aggregate(pipeline);
    res.json({ success: true, data });
  } catch (err) {
    console.error('District analytics error', err);
    res.status(500).json({ error: 'Failed to compute district analytics' });
  }
});

// Property type analytics
router.get('/analytics/property-types', adminAuth, async (req, res) => {
  try {
    const { district, area } = req.query;
    const match = {};
    if (district) match.district = district;
    if (area) match.area = area;

    const pipeline = [
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $group: {
          _id: '$propertyType',
          count: { $sum: 1 },
          avgRent: { $avg: '$rent' },
          minRent: { $min: '$rent' },
          maxRent: { $max: '$rent' }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          avgRent: { $round: ['$avgRent', 0] },
          minRent: 1,
          maxRent: 1
        }
      },
      { $sort: { count: -1 } }
    ];
    const data = await MarketSample.aggregate(pipeline);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Property type analytics error', err);
    res.status(500).json({ error: 'Failed to compute property type analytics' });
  }
});

// Monthly trends analytics
router.get('/analytics/monthly-trends', adminAuth, async (req, res) => {
  try {
    const pipeline = [
      {
        $addFields: {
          month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
        }
      },
      {
        $group: {
          _id: '$month',
          properties: { $sum: 1 },
          avgRent: { $avg: '$rent' },
          totalRent: { $sum: '$rent' }
        }
      },
      {
        $project: {
          month: '$_id',
          properties: 1,
          avgRent: { $round: ['$avgRent', 0] },
          totalRent: { $round: ['$totalRent', 0] }
        }
      },
      { $sort: { month: 1 } }
    ];
    const data = await MarketSample.aggregate(pipeline);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Monthly trends analytics error', err);
    res.status(500).json({ error: 'Failed to compute monthly trends' });
  }
});

// Overall statistics
router.get('/analytics/overview', adminAuth, async (req, res) => {
  try {
    const [stats] = await MarketSample.aggregate([
      {
        $group: {
          _id: null,
          totalProperties: { $sum: 1 },
          avgRent: { $avg: '$rent' },
          minRent: { $min: '$rent' },
          maxRent: { $max: '$rent' },
          uniqueDistricts: { $addToSet: '$district' },
          uniqueAreas: { $addToSet: '$area' },
          uniquePropertyTypes: { $addToSet: '$propertyType' }
        }
      },
      {
        $project: {
          totalProperties: 1,
          avgRent: { $round: ['$avgRent', 0] },
          minRent: 1,
          maxRent: 1,
          uniqueDistricts: { $size: '$uniqueDistricts' },
          uniqueAreas: { $size: '$uniqueAreas' },
          uniquePropertyTypes: { $size: '$uniquePropertyTypes' }
        }
      }
    ]);
    
    res.json({ success: true, data: stats || {
      totalProperties: 0,
      avgRent: 0,
      minRent: 0,
      maxRent: 0,
      uniqueDistricts: 0,
      uniqueAreas: 0,
      uniquePropertyTypes: 0
    }});
  } catch (err) {
    console.error('Overview analytics error', err);
    res.status(500).json({ error: 'Failed to compute overview analytics' });
  }
});

// Snapshot stats regeneration (persist to MarketStats)
router.post('/analytics/rebuild-stats', adminAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.body || {};
    const addFields = { month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } };
    const groupId = { district: '$district', area: '$area', period: '$month' };
    const pipeline = [
      { $addFields: addFields },
      { $group: { _id: groupId, sampleCount: { $sum: 1 }, avgRent: { $avg: '$rent' }, minRent: { $min: '$rent' }, maxRent: { $max: '$rent' }, rents: { $push: '$rent' } } }
    ];
    const raw = await MarketSample.aggregate(pipeline);
    // compute median
    const statsDocs = raw.map(r => {
      const sorted = r.rents.sort((a,b)=>a-b);
      const mid = Math.floor(sorted.length/2);
      const median = sorted.length %2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
      return {
        district: r._id.district,
        area: r._id.area,
        period: r._id.period,
        sampleCount: r.sampleCount,
        avgRent: r.avgRent,
        medianRent: median,
        minRent: r.minRent,
        maxRent: r.maxRent
      };
    });
    // Clear existing for same periods
    await MarketStats.deleteMany({ period: { $in: [...new Set(statsDocs.map(d=>d.period))] } });
    await MarketStats.insertMany(statsDocs);
    res.json({ success: true, periods: [...new Set(statsDocs.map(d=>d.period))], inserted: statsDocs.length });
  } catch (err) {
    console.error('Rebuild stats error', err);
    res.status(500).json({ error: 'Failed to rebuild stats' });
  }
});

// List stored market samples (paginated)
router.get('/market-samples', adminAuth, async (req, res) => {
  try {
  const { page = 1, limit = 20, district, area, q, minRent, maxRent, title, propertyType, rentCategory,
    bedroomsMin, bedroomsMax, roomsMin, roomsMax, bathroomsMin, bathroomsMax, seatsMin, seatsMax,
  rentPerRoomMin, rentPerRoomMax, createdFrom, createdTo, location, availableFrom, scrapedAt, url } = req.query;
    const query = {};
  if (district) query.district = new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  if (area) query.area = new RegExp(area.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  if (title) query.title = new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  if (propertyType) query.propertyType = new RegExp(propertyType.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  if (rentCategory) query.rentCategory = new RegExp(rentCategory.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  if (location) query.location = new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  if (availableFrom) query.availableFrom = new RegExp(availableFrom.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  if (scrapedAt) query.scrapedAt = new RegExp(scrapedAt.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  if (url) query.url = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
    if (minRent || maxRent) {
      query.rent = { ...(query.rent||{}) };
      if (minRent) query.rent.$gte = Number(minRent);
      if (maxRent) query.rent.$lte = Number(maxRent);
    }

    // Helper to add numeric range
    const addRange = (field, minVal, maxVal) => {
      if (minVal || maxVal) {
        query[field] = query[field] || {};
        if (minVal) query[field].$gte = Number(minVal);
        if (maxVal) query[field].$lte = Number(maxVal);
      }
    };
    addRange('bedrooms', bedroomsMin, bedroomsMax);
    addRange('rooms', roomsMin, roomsMax);
    addRange('bathrooms', bathroomsMin, bathroomsMax);
    addRange('seats', seatsMin, seatsMax);
    addRange('rentPerRoom', rentPerRoomMin, rentPerRoomMax);

    // Created date range
    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) {
        const fromDate = new Date(createdFrom);
        if (!isNaN(fromDate)) query.createdAt.$gte = fromDate;
      }
      if (createdTo) {
        const toDate = new Date(createdTo);
        if (!isNaN(toDate)) {
          // make inclusive by advancing to next day minus 1ms if no time component
          if (toDate.getHours()===0 && toDate.getMinutes()===0 && toDate.getSeconds()===0) {
            toDate.setDate(toDate.getDate()+1);
          }
          query.createdAt.$lte = toDate;
        }
      }
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    // Field map for token parsing
    const fieldMap = {
      title: 'title',
      type: 'propertyType',
      property: 'propertyType',
      propertytype: 'propertyType',
      area: 'area',
      district: 'district',
      location: 'location',
      category: 'rentCategory',
      rentcategory: 'rentCategory',
      bedrooms: 'bedrooms',
      beds: 'bedrooms',
      rooms: 'rooms',
      bathrooms: 'bathrooms',
      baths: 'bathrooms',
      seats: 'seats',
      rentperroom: 'rentPerRoom',
      rent_per_room: 'rentPerRoom',
      rent: 'rent',
      availablefrom: 'availableFrom',
      available_from: 'availableFrom',
      url: 'url'
    };

  // Retain advanced token search only if q provided (legacy unified search)
  if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      const freeText = [];
      const andClauses = [];
      tokens.forEach(raw => {
        const t = raw.trim();
        const m = t.match(/^(\w+):(>=|<=|>|<|=)?(.+)$/); // field comparator value
        if (m) {
          let [, fld, op, val] = m;
            fld = fld.toLowerCase();
            const mapped = fieldMap[fld];
            if (!mapped) { freeText.push(t); return; }
            val = val.trim();
            // numeric fields
            const numericFields = ['rent','bedrooms','rooms','bathrooms','seats','rentPerRoom'];
            if (numericFields.includes(mapped)) {
              const num = Number(val);
              if (!isNaN(num)) {
                const cond = {}; // build comparator
                if (op === '>' ) cond.$gt = num;
                else if (op === '<') cond.$lt = num;
                else if (op === '>=') cond.$gte = num;
                else if (op === '<=') cond.$lte = num;
                else cond.$eq = num;
                query[mapped] = { ...(query[mapped]||{}), ...cond };
              }
            } else {
              // text field: create case-insensitive regex
              const safe = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              query[mapped] = new RegExp(safe, 'i');
            }
            return;
        }
        // range pattern for rent or numeric: 10000-20000
        if (/^\d+-\d+$/.test(t)) {
          const [lo, hi] = t.split('-').map(Number);
          query.rent = { $gte: lo, $lte: hi };
          return;
        }
        // simple rent comparator shorthand like >20000 or <15000
        if (/^[<>]=?\d+$/.test(t)) {
          const op = t[0];
          const hasEq = t[1] === '=';
          const num = Number(t.replace(/[^0-9]/g,''));
          query.rent = query.rent || {};
          if (op === '>') query.rent[hasEq?'$gte':'$gt'] = num; else query.rent[hasEq?'$lte':'$lt'] = num;
          return;
        }
        freeText.push(t);
      });

      if (freeText.length) {
        freeText.forEach(term => {
          const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const rx = new RegExp(safe, 'i');
          andClauses.push({ $or: [
            { title: rx },
            { propertyType: rx },
            { area: rx },
            { district: rx },
            { location: rx },
            { rentCategory: rx },
            { availableFrom: rx },
            { url: rx }
          ]});
        });
      }
      if (andClauses.length) {
        query.$and = (query.$and || []).concat(andClauses);
      }
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      MarketSample.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      MarketSample.countDocuments(query)
    ]);
    res.json({ success: true, page: Number(page), limit: Number(limit), total, items });
  } catch (e) {
    console.error('Fetch market samples error', e);
    res.status(500).json({ error: 'Failed to fetch market samples' });
  }
});

// Update a market sample
router.patch('/market-samples/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['title','propertyType','area','district','location','rent','rentCategory','bedrooms','rooms','bathrooms','seats','rentPerRoom','availableFrom','url'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (['rent','bedrooms','rooms','bathrooms','seats','rentPerRoom'].includes(key)) {
          update[key] = req.body[key] === '' ? undefined : Number(req.body[key]);
        } else {
          update[key] = req.body[key];
        }
      }
    }
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const doc = await MarketSample.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, item: doc });
  } catch (e) {
    console.error('Update sample error', e);
    res.status(500).json({ error: 'Failed to update sample' });
  }
});

// Delete a market sample
router.delete('/market-samples/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MarketSample.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, deleted: id });
  } catch (e) {
    console.error('Delete sample error', e);
    res.status(500).json({ error: 'Failed to delete sample' });
  }
});

// Bulk delete market samples
router.post('/market-samples/bulk-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    const result = await MarketSample.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (e) {
    console.error('Bulk delete error', e);
    res.status(500).json({ error: 'Failed bulk delete' });
  }
});

// Helper functions
function validateScrapedRecord(record) {
  const issues = [];
  let valid = true;

  // Title is OPTIONAL now (do not mark missing title as invalid)

  if (!record.rent || isNaN(parseInt(record.rent)) || parseInt(record.rent) <= 0) {
    issues.push('Invalid rent value');
    valid = false;
  }

  if (!record.area || record.area.trim() === '') {
    issues.push('Missing area');
    valid = false;
  }

  if (!record.district || record.district.trim() === '') {
    issues.push('Missing district');
    valid = false;
  }

  if (!record.property_type || record.property_type.trim() === '') {
    issues.push('Missing property type');
    valid = false;
  }

  return { valid, issues };
}

function extractAreaFromFilename(filename) {
  // Extract area from filename like "Dhanmondi_Dhaka_properties.csv"
  const parts = filename.split('_');
  return parts[0] || 'Unknown';
}

function extractDistrictFromFilename(filename) {
  // Extract district from filename like "Dhanmondi_Dhaka_properties.csv"
  const parts = filename.split('_');
  return parts[1] || 'Unknown';
}

// Property features analytics (bedrooms, bathrooms, rooms)
router.get('/analytics/property-features', adminAuth, async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: null,
          avgBedrooms: { $avg: '$bedrooms' },
          avgBathrooms: { $avg: '$bathrooms' },
          avgRooms: { $avg: '$rooms' }
        }
      },
      {
        $project: {
          avgBedrooms: { $round: ['$avgBedrooms', 1] },
          avgBathrooms: { $round: ['$avgBathrooms', 1] },
          avgRooms: { $round: ['$avgRooms', 1] }
        }
      }
    ];

    // Get bedroom distribution
    const bedroomDistribution = await MarketSample.aggregate([
      { $match: { bedrooms: { $ne: null, $exists: true } } },
      { $group: { _id: '$bedrooms', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { bedrooms: '$_id', count: 1, _id: 0 } }
    ]);

    // Get bathroom distribution
    const bathroomDistribution = await MarketSample.aggregate([
      { $match: { bathrooms: { $ne: null, $exists: true } } },
      { $group: { _id: '$bathrooms', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { bathrooms: '$_id', count: 1, _id: 0 } }
    ]);

    const [stats] = await MarketSample.aggregate(pipeline);
    
    res.json({ 
      success: true, 
      data: {
        avgBedrooms: (stats && stats.avgBedrooms) || 0,
        avgBathrooms: (stats && stats.avgBathrooms) || 0,
        avgRooms: (stats && stats.avgRooms) || 0,
        bedroomDistribution,
        bathroomDistribution
      }
    });
  } catch (err) {
    console.error('Property features analytics error', err);
    res.status(500).json({ error: 'Failed to compute property features analytics' });
  }
});

// Price trends analytics
router.get('/analytics/price-trends', adminAuth, async (req, res) => {
  try {
    const pipeline = [
      {
        $addFields: {
          uploadMonth: { $dateToString: { format: '%Y-%m', date: '$uploadedAt' } }
        }
      },
      {
        $group: {
          _id: '$uploadMonth',
          avgRent: { $avg: '$rent' },
          minRent: { $min: '$rent' },
          maxRent: { $max: '$rent' },
          properties: { $sum: 1 }
        }
      },
      {
        $project: {
          month: '$_id',
          avgRent: { $round: ['$avgRent', 0] },
          minRent: 1,
          maxRent: 1,
          properties: 1,
          _id: 0
        }
      },
      { $sort: { month: 1 } }
    ];
    
    const data = await MarketSample.aggregate(pipeline);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Price trends analytics error', err);
    res.status(500).json({ error: 'Failed to compute price trends analytics' });
  }
});

// Upload trends analytics
router.get('/analytics/upload-trends', adminAuth, async (req, res) => {
  try {
    const pipeline = [
      {
        $addFields: {
          uploadDate: { $dateToString: { format: '%Y-%m-%d', date: '$uploadedAt' } }
        }
      },
      {
        $group: {
          _id: '$uploadDate',
          uploads: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          uploads: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ];
    
    const data = await MarketSample.aggregate(pipeline);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Upload trends analytics error', err);
    res.status(500).json({ error: 'Failed to compute upload trends analytics' });
  }
});

// Area-wise analytics
router.get('/analytics/areas', adminAuth, async (req, res) => {
  try {
    const { district } = req.query;
    
    let matchStage = {};
    if (district && district !== '') {
      matchStage.district = district;
    }
    
    const pipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: { district: '$district', area: '$area' },
          properties: { $sum: 1 },
          avgRent: { $avg: '$rent' },
          minRent: { $min: '$rent' },
          maxRent: { $max: '$rent' },
          avgBedrooms: { $avg: '$bedrooms' },
          avgBathrooms: { $avg: '$bathrooms' },
          avgRooms: { $avg: '$rooms' }
        }
      },
      {
        $project: {
          district: '$_id.district',
          area: '$_id.area',
          properties: 1,
          avgRent: { $round: ['$avgRent', 0] },
          minRent: 1,
          maxRent: 1,
          avgBedrooms: { $round: ['$avgBedrooms', 1] },
          avgBathrooms: { $round: ['$avgBathrooms', 1] },
          avgRooms: { $round: ['$avgRooms', 1] }
        }
      },
      { $sort: { district: 1, properties: -1 } }
    ];
    
    const data = await MarketSample.aggregate(pipeline);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Area analytics error', err);
    res.status(500).json({ error: 'Failed to compute area analytics' });
  }
});

module.exports = router;
