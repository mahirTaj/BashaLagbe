import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Box, TextField, Button, Paper, Container, Typography, Alert } from '@mui/material';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const ok = await login({ email, password });
    if (ok) navigate('/'); else setError('Invalid credentials');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p:4 }}>
          <Typography variant="h5" sx={{ mb:2 }}>Login</Typography>
          {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" sx={{ mb:2 }} value={email} onChange={(e)=>setEmail(e.target.value)} />
            <TextField fullWidth label="Password" type="password" sx={{ mb:2 }} value={password} onChange={(e)=>setPassword(e.target.value)} />
            <Button type="submit" variant="contained">Login</Button>
            <Button sx={{ ml:2 }} onClick={()=>navigate('/register')}>Register</Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
