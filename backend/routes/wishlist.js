const express = require('express');
const router = express.Router();
const Wishlist = require('../models/wishlist');
const verifyToken = require('../middleware/auth'); // ✅ matches new export
const requireAuth = verifyToken; // for clarity in route usage

// Add listing to wishlist (auth removed for demo)
router.post('/', async (req, res) => {
  const { listingId, folder } = req.body;
  let wishlist = await Wishlist.findOne({ user: req.user?.id || 'demo-user' });

  if (!wishlist) {
    wishlist = new Wishlist({
      user: req.user?.id || 'demo-user',
      listings: []
    });
  }

  wishlist.listings.push({ listing: listingId, folder });
  await wishlist.save();

  // ✅ Populate so the page gets ready-to-render data
  await wishlist.populate('listings.listing');
  res.json(wishlist);
});

// Get wishlist (auth removed for demo)
router.get('/', async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user?.id || 'demo-user' })
    .populate('listings.listing');
  res.json(wishlist);
});

// Remove from wishlist (auth removed for demo)
router.delete('/:listingId', async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user?.id || 'demo-user' });

  wishlist.listings = wishlist.listings.filter(
    item => item.listing.toString() !== req.params.listingId
  );
  await wishlist.save();

  // ✅ Populate here as well so frontend instantly reflects update
  await wishlist.populate('listings.listing');
  res.json(wishlist);
});

module.exports = router;