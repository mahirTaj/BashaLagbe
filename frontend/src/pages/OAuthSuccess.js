import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const { setAuthToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // Use AuthProvider setter so axios header is set and profile is fetched
      if (setAuthToken) setAuthToken(token);
      setTimeout(() => navigate('/'), 800);
    }
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <h2>Login successful!</h2>
      <p>Redirecting...</p>
    </div>
  );
}