// pages/MessageInterface.js
import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import MessageInterface from '../components/ui/MessageInterface';

export default function MessageInterfacePage() {
  const location = useLocation();
  const { landlordId: landlordIdFromParams } = useParams();

  // Preferred: data passed via router state
  const { listingId, receiverId, listingTitle } = location.state || {};

  // Resolve final landlordId — state wins over URL param
  const landlordId = receiverId || landlordIdFromParams;

  // Guard: don’t render until we have the essentials
  if (!listingId || !landlordId) {
    return <div>Loading chat…</div>;
  }

  return (
    <MessageInterface
      listingId={listingId}
      landlordId={landlordId}
      listingTitle={listingTitle || ''}
    />
  );
}