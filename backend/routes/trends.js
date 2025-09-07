const express = require('express');
const router = express.Router();
const Listing = require('../models/listings');
const MarketSample = require('../models/MarketSample');

// Fallback: redirect compare calls here to the canonical listings compare endpoint
router.get('/compare', async (req, res) => {
  try {
    const qs = req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '';
    // 307 preserves method; axios will follow redirect
    return res.redirect(307, '/api/listings/trends/compare' + qs);
  } catch (err) {
    console.error('Trends compare fallback error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch comparison data' });
  }
});

// Get rent price trends with comprehensive filtering
router.get('/', async (req, res) => {
  try {
    const {
      area,
      district,
      minRent,
      maxRent,
      startDate,
      endDate,
      dataSource = 'both', // 'scraped', 'listings', 'both'
      propertyType,
      period = 'month', // 'day', 'week', 'month', 'year'
      limit = 100
    } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Default to last 12 months if no date range specified
    if (!startDate && !endDate) {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      dateFilter.$gte = twelveMonthsAgo;
    }

    // Determine date grouping format
    const getDateFormat = (period) => {
      switch (period) {
        case 'day': return '%Y-%m-%d';
        case 'week': return '%Y-%U';
        case 'month': return '%Y-%m';
        case 'year': return '%Y';
        default: return '%Y-%m';
      }
    };

    const dateFormat = getDateFormat(period);

    // Scraped data pipeline
    const scrapedPipeline = [];
    if (dataSource === 'scraped' || dataSource === 'both') {
      const scrapedMatch = { createdAt: dateFilter };
      
      // Add location filters
      if (area) scrapedMatch.area = { $regex: area, $options: 'i' };
      if (district) scrapedMatch.district = { $regex: district, $options: 'i' };
      
      // Add rent range filter
      if (minRent || maxRent) {
        scrapedMatch.rent = {};
        if (minRent) scrapedMatch.rent.$gte = Number(minRent);
        if (maxRent) scrapedMatch.rent.$lte = Number(maxRent);
      }
      
      // Add property type filter
      if (propertyType) {
        scrapedMatch.propertyType = { $regex: propertyType, $options: 'i' };
      }

      scrapedPipeline.push([
        { $match: scrapedMatch },
        {
          $addFields: {
            period: { $dateToString: { format: dateFormat, date: '$createdAt' } }
          }
        },
        {
          $group: {
            _id: {
              period: '$period',
              area: '$area',
              district: '$district'
            },
            avgRent: { $avg: '$rent' },
            minRent: { $min: '$rent' },
            maxRent: { $max: '$rent' },
            count: { $sum: 1 },
            dataSource: { $first: 'scraped' }
          }
        },
        {
          $project: {
            _id: 0,
            period: '$_id.period',
            area: '$_id.area',
            district: '$_id.district',
            location: {
              $cond: {
                if: { $ne: ['$_id.area', null] },
                then: '$_id.area',
                else: '$_id.district'
              }
            },
            avgRent: { $round: ['$avgRent', 0] },
            minRent: 1,
            maxRent: 1,
            count: 1,
            dataSource: 1
          }
        },
        { $sort: { period: 1, location: 1 } },
        { $limit: Number(limit) }
      ]);
    }

    // User listings pipeline
    const listingsPipeline = [];
    if (dataSource === 'listings' || dataSource === 'both') {
      const listingsMatch = { createdAt: dateFilter };
      
      // Add location filters
      if (area) listingsMatch.area = { $regex: area, $options: 'i' };
      if (district) listingsMatch.district = { $regex: district, $options: 'i' };
      
      // Add price range filter
      if (minRent || maxRent) {
        listingsMatch.price = {};
        if (minRent) listingsMatch.price.$gte = Number(minRent);
        if (maxRent) listingsMatch.price.$lte = Number(maxRent);
      }
      
      // Add property type filter
      if (propertyType) {
        listingsMatch.type = { $regex: propertyType, $options: 'i' };
      }

      listingsPipeline.push([
        { $match: listingsMatch },
        {
          $addFields: {
            period: { $dateToString: { format: dateFormat, date: '$createdAt' } }
          }
        },
        {
          $group: {
            _id: {
              period: '$period',
              area: '$area',
              district: '$district'
            },
            avgRent: { $avg: '$price' },
            minRent: { $min: '$price' },
            maxRent: { $max: '$price' },
            count: { $sum: 1 },
            dataSource: { $first: 'listings' }
          }
        },
        {
          $project: {
            _id: 0,
            period: '$_id.period',
            area: '$_id.area',
            district: '$_id.district',
            location: {
              $cond: {
                if: { $ne: ['$_id.area', null] },
                then: '$_id.area',
                else: '$_id.district'
              }
            },
            avgRent: { $round: ['$avgRent', 0] },
            minRent: 1,
            maxRent: 1,
            count: 1,
            dataSource: 1
          }
        },
        { $sort: { period: 1, location: 1 } },
        { $limit: Number(limit) }
      ]);
    }

    // Execute pipelines
    const promises = [];
    if (scrapedPipeline.length > 0) {
      promises.push(MarketSample.aggregate(scrapedPipeline[0]));
    }
    if (listingsPipeline.length > 0) {
      promises.push(Listing.aggregate(listingsPipeline[0]));
    }

    const results = await Promise.all(promises);
    
    // Combine results
    let combinedData = [];
    results.forEach(result => {
      if (result && result.length > 0) {
        combinedData = combinedData.concat(result);
      }
    });

    // If both sources requested, merge data for same period/location
    if (dataSource === 'both' && results.length > 1) {
      const mergedData = new Map();
      
      combinedData.forEach(item => {
        const key = `${item.period}-${item.location}`;
        if (mergedData.has(key)) {
          const existing = mergedData.get(key);
          const totalCount = existing.count + item.count;
          const weightedAvg = (existing.avgRent * existing.count + item.avgRent * item.count) / totalCount;
          
          mergedData.set(key, {
            ...existing,
            avgRent: Math.round(weightedAvg),
            minRent: Math.min(existing.minRent, item.minRent),
            maxRent: Math.max(existing.maxRent, item.maxRent),
            count: totalCount,
            dataSource: 'combined'
          });
        } else {
          mergedData.set(key, item);
        }
      });
      
      combinedData = Array.from(mergedData.values());
    }

    // Sort by period and location
    combinedData.sort((a, b) => {
      if (a.period !== b.period) return a.period.localeCompare(b.period);
      return a.location.localeCompare(b.location);
    });

    // Group by location for chart consumption
    const groupedData = {};
    combinedData.forEach(item => {
      if (!groupedData[item.location]) {
        groupedData[item.location] = [];
      }
      groupedData[item.location].push({
        period: item.period,
        avgRent: item.avgRent,
        minRent: item.minRent,
        maxRent: item.maxRent,
        count: item.count,
        dataSource: item.dataSource
      });
    });

    // Calculate summary statistics
    const totalRecords = combinedData.reduce((sum, item) => sum + item.count, 0);
    const overallAvgRent = combinedData.length > 0 
      ? Math.round(combinedData.reduce((sum, item) => sum + (item.avgRent * item.count), 0) / totalRecords)
      : 0;

    res.json({
      success: true,
      data: groupedData,
      summary: {
        totalRecords,
        overallAvgRent,
        locations: Object.keys(groupedData).length,
        periods: [...new Set(combinedData.map(item => item.period))].length,
        dateRange: {
          start: combinedData.length > 0 ? combinedData[0].period : null,
          end: combinedData.length > 0 ? combinedData[combinedData.length - 1].period : null
        }
      },
      filters: {
        area,
        district,
        minRent,
        maxRent,
        startDate,
        endDate,
        dataSource,
        propertyType,
        period
      }
    });

  } catch (error) {
    console.error('Trends API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends data',
      message: error.message
    });
  }
});

// Get available filter options
router.get('/filters', async (req, res) => {
  try {
    const [scrapedAreas, scrapedDistricts, listingAreas, listingDistricts, propertyTypes] = await Promise.all([
      MarketSample.distinct('area'),
      MarketSample.distinct('district'),
      Listing.distinct('area'),
      Listing.distinct('district'),
      MarketSample.distinct('propertyType')
    ]);

    // Combine and deduplicate
    const allAreas = [...new Set([...scrapedAreas, ...listingAreas])].filter(Boolean).sort();
    const allDistricts = [...new Set([...scrapedDistricts, ...listingDistricts])].filter(Boolean).sort();

    res.json({
      success: true,
      areas: allAreas,
      districts: allDistricts,
      propertyTypes: propertyTypes.filter(Boolean).sort()
    });
  } catch (error) {
    console.error('Filters API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options'
    });
  }
});

module.exports = router;
