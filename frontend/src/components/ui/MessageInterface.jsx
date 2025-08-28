// src/components/ui/MessageInterface.jsx
import { useLocation } from 'react-router-dom';
import ChatBox from '../ChatBox';

export default function MessageInterface() {
  const location = useLocation();
  const { listingId, receiverId, currentUserId, listingTitle } = location.state || {};

  if (!listingId || !receiverId) {
    return (
      <div style={{ padding: '1rem', color: 'red' }}>
        Missing conversation details.  
        Please navigate here via the Contact Landlord button.
      </div>
    );
  }

  return (
    <div style={{ padding: '1em', border: '1px solid #ccc' }}>
      <h2>
        {listingTitle
          ? `${listingTitle} — Chat`
          : `${currentUserId || 'You'} ↔ ${receiverId}`}
      </h2>

      {/* ChatBox now fully handles fetching, sending, and live updates */}
      <ChatBox listingId={listingId} receiverId={receiverId} />
    </div>
  );
}