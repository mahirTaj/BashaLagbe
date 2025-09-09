import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Box,
  TextField,
  Button,
  Paper,
  Container,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Avatar,
  Grow
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import jwtDecode from 'jwt-decode';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { adminLogin } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const ok = await login({ email, password });
    if (!ok) {
      setError('Invalid credentials');
      return;
    }
    // Read token from localStorage saved by user login
    const token = localStorage.getItem('authToken');
    let decoded = null;
    try { decoded = token ? jwtDecode(token) : null; } catch {}
    if (decoded && decoded.role === 'admin') {
      // Also set admin state for admin accounts
      try { await adminLogin(email, password); } catch {}
      navigate('/admin-panel');
    } else {
      navigate('/profile');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        background: [
          'radial-gradient(1200px 800px at 10% 10%, rgba(124,58,237,0.16), transparent 60%)',
          'radial-gradient(1000px 600px at 90% 30%, rgba(99,102,241,0.14), transparent 60%)',
          'linear-gradient(135deg, #0b1020, #121a2e)'
        ].join(', ')
      }}
    >
      {/* Floating glow accents */}
      <Box sx={{
        position: 'absolute', width: 220, height: 220, borderRadius: '50%', filter: 'blur(60px)',
        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', opacity: 0.25, top: -40, left: -40,
        animation: 'float1 10s ease-in-out infinite'
      }} />
      <Box sx={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%', filter: 'blur(70px)',
        background: 'linear-gradient(135deg,#22c55e,#a3e635)', opacity: 0.18, bottom: -60, right: -40,
        animation: 'float2 12s ease-in-out infinite'
      }} />

      <Container maxWidth="sm">
        <Grow in timeout={500}>
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 24px 64px rgba(2,6,23,0.35)'
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  mx: 'auto',
                  mb: 2,
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: '0 10px 36px rgba(79,70,229,0.35)'
                }}
              >
                <LoginIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Welcome Back
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to continue to BashaLagbe
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                sx={{ mb: 2.5 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': { borderColor: '#7c3aed' },
                      '&.Mui-focused fieldset': { borderColor: '#7c3aed' }
                    }
                  }
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                sx={{ mb: 3 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': { borderColor: '#7c3aed' },
                      '&.Mui-focused fieldset': { borderColor: '#7c3aed' }
                    }
                  }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1 55%,#7c3aed)',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  textTransform: 'none',
                  boxShadow: '0 12px 32px rgba(79,70,229,0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg,#4f46e5,#6366f1 55%,#7c3aed)',
                    boxShadow: '0 18px 44px rgba(124,58,237,0.45)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.25s ease'
                }}
              >
                Login
              </Button>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button onClick={() => navigate('/register')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Create a new account
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grow>
      </Container>

      {/* simple keyframes */}
      <style>{`
        @keyframes float1 { 0% { transform: translateY(0) } 50% { transform: translateY(10px) } 100% { transform: translateY(0) } }
        @keyframes float2 { 0% { transform: translateY(0) } 50% { transform: translateY(-12px) } 100% { transform: translateY(0) } }
      `}</style>
    </Box>
  );
}
