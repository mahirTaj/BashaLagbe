import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth();
  // While auth is loading, don't render anything (avoids flicker)
  if (loading) return null;
  // Require a resolved `user` object. Presence of a token alone is not enough because
  // the profile fetch may have failed or not completed yet.
  return user ? children : <Navigate to="/login" />;
}