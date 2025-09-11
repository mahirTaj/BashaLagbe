import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Box, Paper, Typography, TextField, Button, Divider } from '@mui/material';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const data = await login(email, password);
      if (!data) return setMessage('Login failed');
      setMessage('Login successful! Welcome, ' + (data.user?.name || ''));
      setTimeout(() => {
        navigate('/profile');
      }, 800);
    } catch (err) {
      const serverMsg = err?.response?.data?.msg || err?.response?.data?.message || err?.response?.data?.error;
      // eslint-disable-next-line no-console
      console.error('Login error', err?.response?.data || err.message);
      setMessage(serverMsg || err.message || 'Login failed');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, px: 2 }}>
      <Paper elevation={10} sx={{ maxWidth: 920, width: '100%', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        {/* Left hero */}
        <Box sx={{ flex: 1.2, background: 'linear-gradient(135deg,#7c3aed 0%,#06b6d4 100%)', color: '#fff', p: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Find your next home</Typography>
          <Typography variant="body1" sx={{ opacity: 0.95, mb: 2 }}>Minimal, fast and local rentals curated for you.</Typography>

          {/* Minimal house icon */}
          <Box sx={{ mt: 1, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="house icon">
              <rect width="120" height="80" rx="8" fill="rgba(255,255,255,0.06)" />
              <path d="M14 44 L60 14 L106 44" stroke="rgba(255,255,255,0.95)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="36" y="44" width="48" height="22" rx="3" stroke="rgba(255,255,255,0.85)" strokeWidth="2" fill="rgba(255,255,255,0.04)" />
              <rect x="56" y="54" width="8" height="12" rx="1" fill="rgba(255,255,255,0.95)" />
              <path d="M30 44 L30 32" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
            </svg>
          </Box>

          <Box sx={{ mt: 'auto', opacity: 0.95 }}>
            <Typography variant="caption">Join thousands of renters finding their perfect place.</Typography>
          </Box>
        </Box>

        {/* Right form */}
        <Box sx={{ flex: 1, p: 4, bgcolor: 'background.paper' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Welcome back</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Sign in to manage your listings or find a place.</Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
            <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required fullWidth />
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required fullWidth />

            <Button type="submit" variant="contained" size="large" sx={{ bgcolor: 'primary.main', textTransform: 'none' }}>Login</Button>

            <Divider sx={{ my: 1 }} />

            <Button onClick={handleGoogleLogin} variant="contained" size="medium" sx={{ backgroundColor: '#4285F4', textTransform: 'none' }}>Login with Google</Button>
          </Box>

          {message && (
            <Typography sx={{ mt: 2, fontWeight: 700 }} color={message.startsWith('Login successful') ? 'success.main' : 'error.main'}>{message}</Typography>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">Don't have an account?</Typography>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>Register</Button>
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}