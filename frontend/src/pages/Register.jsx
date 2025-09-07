import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Box, TextField, Button, Paper, Container, Typography, Alert, MenuItem } from '@mui/material';

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
    if (ok) navigate('/'); else setError('Registration failed');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p:4 }}>
          <Typography variant="h5" sx={{ mb:2 }}>Register</Typography>
          {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Name" sx={{ mb:2 }} value={name} onChange={(e)=>setName(e.target.value)} />
            <TextField fullWidth label="Email" sx={{ mb:2 }} value={email} onChange={(e)=>setEmail(e.target.value)} />
            <TextField fullWidth label="Password" type="password" sx={{ mb:2 }} value={password} onChange={(e)=>setPassword(e.target.value)} />
            <TextField select fullWidth label="Role" sx={{ mb:2 }} value={role} onChange={(e)=>setRole(e.target.value)}>
              <MenuItem value="renter">Renter</MenuItem>
              <MenuItem value="owner">Owner</MenuItem>
            </TextField>
            <Button type="submit" variant="contained">Register</Button>
            <Button sx={{ ml:2 }} onClick={()=>navigate('/admin-login')}>Admin Login</Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
