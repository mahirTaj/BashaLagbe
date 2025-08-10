import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      setTimeout(() => navigate('/'), 1500);
    }
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <h2>Login successful!</h2>
      <p>Redirecting...</p>
    </div>
  );
}