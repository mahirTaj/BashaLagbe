// pages/MessageInterface.js
import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import MessageInterface from '../components/ui/MessageInterface';

export default function MessageInterfacePage() {
  const location = useLocation();
  const { landlordId: landlordIdFromParams } = useParams();

  // Try to get data from router state first (preferred)
  const { listingId, receiverId, listingTitle } = location.state || {};

  return (
    <MessageInterface
      listingId={listingId || ''}
      landlordId={receiverId || landlordIdFromParams || ''}
      listingTitle={listingTitle || ''}
    />
  );
}