import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import axios from 'axios';

export default function WishlistButton({ listingId }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Optional: include token for real auth mode
  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 🔍 Check if this listing is already in wishlist
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get('/api/wishlist', { headers: authHeaders() });
        if (data?.listings?.some(item => item.listing?._id === listingId)) {
          setSaved(true);
        }
      } catch (err) {
        console.error('Error checking wishlist status:', err);
      }
    })();
  }, [listingId]);

  const toggleWishlist = async () => {
    try {
      setLoading(true);
      if (!saved) {
        await axios.post('/api/wishlist', { listingId }, { headers: authHeaders() });
        alert('Added to wishlist ✅');
        setSaved(true);
      } else {
        await axios.delete(`/api/wishlist/${listingId}`, { headers: authHeaders() });
        setSaved(false);
      }
      // 🔔 Tell wishlist page(s) to refresh
      window.dispatchEvent(new Event('wishlistUpdated'));
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