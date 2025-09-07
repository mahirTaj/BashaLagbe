import React from 'react';
import { Navigate } from 'react-router-dom';

// The global Compare page was removed in favor of a per-listing Compare modal.
// Keep a small redirect stub so any stray links send users back to the homepage.
export default function CompareListings() {
  console.warn('CompareListings page is removed; redirecting to home.');
  return <Navigate to="/" replace />;
}
