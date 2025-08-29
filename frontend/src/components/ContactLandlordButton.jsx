import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { findOrCreateThread } from '../messages';
import { useState } from 'react';

export default function ContactLandlordButton({ landlordId, listingTitle, listingId }) {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    // 🔹 Debug logs
    console.log('[ContactLandlordButton] user from useAuth():', user);
    console.log('[ContactLandlordButton] Props:', {
      landlordId,
      listingId,
      listingTitle,
      currentUserId: user?._id || user?.id
    });

    // 🔹 Safe login check — works for both `_id` and `id`
    if (!(user?._id || user?.id)) {
      alert('Please log in to contact the landlord.');
      return;
    }

    if (!landlordId || !listingId) {
      alert('Missing landlord or listing info.');
      return;
    }

    setLoading(true);
    try {
      const { thread } = await findOrCreateThread({
        listingId,
        landlordId,
        currentUserId: user._id || user.id
      });

      if (thread?._id) {
        navigate(`/messages/${thread._id}`);
      } else {
        navigate('/messages', {
          state: {
            listingId,
            receiverId: landlordId,
            listingTitle,
            currentUserId: user._id || user.id
          }
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