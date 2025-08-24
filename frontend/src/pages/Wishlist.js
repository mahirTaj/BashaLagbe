import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../auth';

export default function WishlistPage() {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);

  const refreshWishlist = () => {
    if (!user) return;
    axios.get('/api/wishlist')
      .then(res => setWishlist(res.data?.listings || []))
      .catch(err => console.error('Error fetching wishlist:', err));
  };

    useEffect(() => {
      refreshWishlist();
    }, [user]);
  
    return (
      <div>
        {/* Render wishlist items here */}
        <h2>Your Wishlist</h2>
        <ul>
          {wishlist.map((item, idx) => (
            <li key={idx}>{item.title || JSON.stringify(item)}</li>
          ))}
        </ul>
      </div>
    );
  }
