const express = require('express');
const router = express.Router();
const Listing = require('../models/listings');
const MarketSample = require('../models/MarketSample');

/**
 * SAMPLE ROUTE: /api/listings/search
 * This route demonstrates proper async/await handling with database queries
 * after ensuring MongoDB connection is ready
 */

// GET /api/listings/search - Search listings with proper async handling
router.get('/search', async (req, res) => {
  try {
    console.log('[listings/search] Starting search request');
    console.log('[listings/search] Query params:', req.query);

    // Extract and validate query parameters
    const {
      type,
      division,
      district,
      subdistrict,
      minPrice,
      maxPrice,
      rooms,
      bathrooms,
      limit = 20,
      skip = 0,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build MongoDB query object
    const query = {};

    // Add filters only if they are provided
    if (type && type !== 'all') {
      query.type = type;
    }

    if (division && division !== 'all') {
      query.division = division;
    }

    if (district && district !== 'all') {
      query.district = district;
    }

    if (subdistrict && subdistrict !== 'all') {
      query.subdistrict = subdistrict;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    // Room/bathroom filters
    if (rooms && rooms !== 'all') {
      query.rooms = parseInt(rooms);
    }

    if (bathrooms && bathrooms !== 'all') {
      query.bathrooms = parseInt(bathrooms);
    }

    console.log('[listings/search] Built query:', JSON.stringify(query, null, 2));

    // Build sort object
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = {};
    sortObj[sort] = sortOrder;

    // Execute the search query with proper async/await
    console.log('[listings/search] Executing database query...');

    const listings = await Listing.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name email') // Populate user info if needed
      .lean(); // Use lean() for better performance on read operations

    // Get total count for pagination
    const totalCount = await Listing.countDocuments(query);

    console.log(`[listings/search] Found ${listings.length} listings out of ${totalCount} total`);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const currentPage = Math.floor(parseInt(skip) / parseInt(limit)) + 1;

    // Return successful response
    res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: {
          currentPage,
          totalPages,
          totalCount,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
          limit: parseInt(limit),
          skip: parseInt(skip)
        },
        query: {
          filters: query,
          sort: sortObj
        }
      },
      message: `Found ${listings.length} listings`
    });

  } catch (error) {
    console.error('[listings/search] Database query error:', error);

    // Handle specific MongoDB errors
    if (error.name === 'MongoTimeoutError') {
      console.error('[listings/search] MongoDB timeout error - connection issue');
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable. Please try again.',
        error: 'Database timeout'
      });
    }

    if (error.name === 'MongoNetworkError') {
      console.error('[listings/search] MongoDB network error - connection lost');
      return res.status(503).json({
        success: false,
        message: 'Database connection lost. Please try again.',
        error: 'Network error'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Failed to search listings',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

/**
 * SAMPLE ROUTE: /api/listings/stats - Get market statistics
 * Demonstrates proper async handling with aggregation queries
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('[listings/stats] Fetching market statistics');

    // Use proper async/await for aggregation pipeline
    const stats = await Listing.aggregate([
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgRooms: { $avg: '$rooms' },
          avgBathrooms: { $avg: '$bathrooms' }
        }
      }
    ]);

    // Get division-wise statistics
    const divisionStats = await Listing.aggregate([
      {
        $group: {
          _id: '$division',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log('[listings/stats] Statistics calculated successfully');

    res.status(200).json({
      success: true,
      data: {
        overall: stats[0] || {},
        byDivision: divisionStats
      },
      message: 'Market statistics retrieved successfully'
    });

  } catch (error) {
    console.error('[listings/stats] Error fetching statistics:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch market statistics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

/**
 * SAMPLE ROUTE: /api/listings/types - Get available listing types
 * Demonstrates proper async handling with distinct queries
 */
router.get('/types', async (req, res) => {
  try {
    console.log('[listings/types] Fetching available listing types');

    // Use proper async/await for distinct query
    const types = await Listing.distinct('type');

    console.log(`[listings/types] Found ${types.length} listing types:`, types);

    res.status(200).json({
      success: true,
      data: types,
      message: `${types.length} listing types available`
    });

  } catch (error) {
    console.error('[listings/types] Error fetching listing types:', error);

    // Handle specific MongoDB timeout error
    if (error.message && error.message.includes('buffering timed out')) {
      console.error('[listings/types] MongoDB buffering timeout - connection issue');
      return res.status(503).json({
        success: false,
        message: 'Database query timed out. Please try again.',
        error: 'Query timeout'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch listing types',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

module.exports = router;