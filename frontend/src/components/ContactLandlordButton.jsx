import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { findOrCreateThread } from '../messages';
import { useState } from 'react';

// 🔑 helper: normalize ID as string
function asString(v) {
  if (!v) return null;
  if (typeof v === 'object' && v._id) return String(v._id); // handle object { _id, name }
  return String(v);
}

export default function ContactLandlordButton({ landlordId, listingTitle, listingId }) {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const currentUserId = asString(user?._id || user?.id);

    // 🔹 Debug logs
    console.log('[ContactLandlordButton] user from useAuth():', user);
    console.log('[ContactLandlordButton] Props:', {
      landlordId,
      listingId,
      listingTitle,
      currentUserId,
    });

    if (!currentUserId) {
      alert('Please log in to contact the landlord.');
      return;
    }
    if (!landlordId || !listingId) {
      alert('Missing landlord or listing info.');
      return;
    }

    setLoading(true);
    try {
      const thread = await findOrCreateThread({
        listingId: asString(listingId),
        landlordId: asString(landlordId),
        currentUserId,
      });

      // ✅ backend returns the thread object directly
      if (thread?._id) {
        navigate(`/messages/${thread._id}`);
      } else {
        navigate('/messages', {
          state: {
            listingId,
            receiverId: asString(landlordId),
            listingTitle,
            currentUserId,
          },
        });
      }
    } catch (err) {
      console.error('Error finding/creating thread:', err);
      alert('Could not start chat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
    >
      {loading ? 'Opening chat...' : 'Contact Landlord'}
    </button>
  );
}
