import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { List, ListItem, ListItemText, CircularProgress } from '@mui/material';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/wishlist', { headers: authHeaders() });
      // ✅ Safely extract listing docs from the wishlist object
      const listings = res.data?.listings?.map(l => l.listing) || [];
      setItems(listings);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();

    // 👂 Listen for updates from any WishlistButton
    const handleUpdate = () => fetchWishlist();
    window.addEventListener('wishlistUpdated', handleUpdate);

    return () => {
      window.removeEventListener('wishlistUpdated', handleUpdate);
    };
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <List>
      {items.length === 0 && <p>No items in wishlist yet</p>}
      {items.map(item => (
        <ListItem key={item._id}>
          <ListItemText primary={item.title || 'Untitled Listing'} />
        </ListItem>
      ))}
    </List>
  );
}