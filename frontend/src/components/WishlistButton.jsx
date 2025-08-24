import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import axios from 'axios';

export default function WishlistButton({ listingId }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleWishlist = async () => {
  console.log('Wishlist button clicked'); // debug line
  try {
    setLoading(true);
    if (!saved) {
  alert('Added to cart ✅'); // fire immediately
  await axios.post(`/api/wishlist`, { listingId });
  setSaved(true);
} else {
  await axios.delete(`/api/wishlist/${listingId}`);
  setSaved(false);
}

  } catch (err) {
    console.error('Wishlist error:', err);
  } finally {
    setLoading(false);
  }
};


  return (
    <Tooltip title={saved ? 'Remove from Wishlist' : 'Add to Wishlist'}>
      <span>
        <IconButton
          onClick={toggleWishlist}
          color={saved ? 'error' : 'default'}
          disabled={loading}
        >
          {saved ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}