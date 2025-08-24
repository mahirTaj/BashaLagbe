import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../auth';
import { Link } from 'react-router-dom';

export default function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);


  useEffect(() => {
    if (!user) return;
    axios
      .get(`/api/wishlist?userId=${user.id}`)
      .then(res => setItems(res.data))
      .catch(err => console.error('Error loading wishlist:', err));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">Your Wishlist</h1>
        <p className="text-gray-600">Please log in to view your wishlist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your Wishlist</h1>
        <Link to="/browse" className="text-blue-600 hover:underline">
          Continue browsing
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No items in your wishlist yet.</p>
          <Link
            to="/browse"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => {
            const id = it?._id || it?.id || it?.listingId;
            const title = it?.title || it?.name || it?.listing?.title || 'Listing';
            const price = it?.price || it?.rent || it?.listing?.rent;
            const location =
              it?.location ||
              it?.listing?.location ||
              it?.area ||
              it?.address ||
              '';
            const img =
              (it?.images && it.images[0]) ||
              it?.listing?.images?.[0] ||
              it?.photo ||
              'https://via.placeholder.com/600x400?text=Listing';

            return (
              <div
                key={id || title}
                className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                <div className="aspect-[4/3] bg-gray-100">
                  <img
                    src={img}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-medium text-gray-900 line-clamp-1">
                    {title}
                  </h3>
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {location}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-blue-700 font-semibold">
                      {price ? `৳${price}` : '—'}
                    </div>
                    {id && (
                      <Link
                        to="/wishlist"
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}