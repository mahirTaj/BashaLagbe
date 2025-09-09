import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import {
  Box,
  TextField,
  Button,
  Paper,
  Container,
  Typography,
  Alert,
  MenuItem,
  InputAdornment,
  Avatar,
  Grow
} from '@mui/material';
import { Person, Email, Lock, AppRegistration as AppRegIcon } from '@mui/icons-material';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('renter');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const ok = await register({ name, email, password, role });
  if (ok) navigate('/login'); else setError('Registration failed');
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
        background: 'linear-gradient(135deg,#22c55e,#a3e635)', opacity: 0.22, top: -40, left: -40,
        animation: 'float1 10s ease-in-out infinite'
      }} />
      <Box sx={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%', filter: 'blur(70px)',
        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', opacity: 0.18, bottom: -60, right: -40,
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
                  background: 'linear-gradient(135deg, #22c55e 0%, #a3e635 100%)',
                  boxShadow: '0 10px 36px rgba(34,197,94,0.35)'
                }}
              >
                <AppRegIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #a3e635 50%, #4ade80 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Create Account
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Join BashaLagbe in a few seconds
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Name"
                sx={{ mb: 2.5 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  )
                }}
              />
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
                  )
                }}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                sx={{ mb: 2.5 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  )
                }}
              />
              <TextField select fullWidth label="Role" sx={{ mb: 3 }} value={role} onChange={(e)=>setRole(e.target.value)}>
                <MenuItem value="renter">Renter</MenuItem>
                <MenuItem value="owner">Owner</MenuItem>
              </TextField>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg,#22c55e,#4ade80 55%,#a3e635)',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  textTransform: 'none',
                  boxShadow: '0 12px 32px rgba(34,197,94,0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg,#22c55e,#4ade80 55%,#a3e635)',
                    boxShadow: '0 18px 44px rgba(34,197,94,0.45)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.25s ease'
                }}
              >
                Register
              </Button>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button onClick={() => navigate('/login')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Already have an account? Login
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grow>
      </Container>

      <style>{`
        @keyframes float1 { 0% { transform: translateY(0) } 50% { transform: translateY(10px) } 100% { transform: translateY(0) } }
        @keyframes float2 { 0% { transform: translateY(0) } 50% { transform: translateY(-12px) } 100% { transform: translateY(0) } }
      `}</style>
    </Box>
  );
}
