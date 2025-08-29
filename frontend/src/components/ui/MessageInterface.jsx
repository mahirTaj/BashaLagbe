// src/components/ui/MessageInterface.jsx
import { useParams, useLocation } from 'react-router-dom';
import ChatBox from '../ChatBox';

export default function MessageInterface({
  listingId: propListingId,
  landlordId: propLandlordId,
  listingTitle: propListingTitle,
  currentUserId: propCurrentUserId
}) {
  // read from URL params
  const { landlordId: paramLandlordId, threadId: paramThreadId } = useParams();

  // read from navigation state
  const location = useLocation();
  const state = location.state || {};

  // final resolved values with fallbacks
  const listingId = propListingId || state.listingId;
  const landlordId = propLandlordId || paramLandlordId || state.receiverId;
  const listingTitle = propListingTitle || state.listingTitle;
  const currentUserId =
    propCurrentUserId ||
    state.currentUserId ||
    localStorage.getItem('userId') ||
    'demo-user';

  // NEW: threadId from params or state
  const threadId = paramThreadId || state.threadId || null;

  if (!threadId && (!listingId || !landlordId)) {
    return (
      <div style={{ padding: '1rem', color: 'red' }}>
        Missing conversation details.
        <br />
        Please navigate here via the Contact Landlord button.
      </div>
    );
  }

  return (
    <div style={{ padding: '1em', border: '1px solid #ccc' }}>
      <h2>
        {listingTitle
          ? `${listingTitle} — Chat`
          : `${currentUserId || 'You'} ↔ ${landlordId || 'Landlord'}`}
      </h2>

      {/* ChatBox handles fetching, sending, and live updates */}
      <ChatBox
        listingId={listingId}
        receiverId={landlordId}
        threadId={threadId} // ✅ NEW: pass threadId if available
      />
    </div>
  );
}