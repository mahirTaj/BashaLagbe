import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Grid,
  TextField,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
  Chip
} from '@mui/material';
import { Link } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuth } from '../auth';

const UserProfile = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');

  const getRoleIcon = (role) => {
    return role === 'owner' ? <BusinessIcon /> : <PersonIcon />;
  };

  const getRoleColor = (role) => {
    return role === 'owner' ? '#4ade80' : '#60a5fa';
  };

  const getRoleLabel = (role) => {
    return role === 'owner' ? 'Property Owner' : 'Tenant';
  };

  if (!user) {
    return (
      <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
        <Alert severity="warning">
          Please log in to view your profile.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">
          Home
        </MuiLink>
        <Typography color="text.primary">My Profile</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PersonIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          My Profile
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: getRoleColor(user.role),
                mx: 'auto',
                mb: 2,
                fontSize: 40
              }}
            >
              {getRoleIcon(user.role)}
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {user.name || 'User'}
            </Typography>
            <Chip
              label={getRoleLabel(user.role)}
              sx={{
                backgroundColor: getRoleColor(user.role),
                color: 'white',
                fontWeight: 600
              }}
            />
          </Paper>
        </Grid>

  <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Account Information
            </Typography>

            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={user.name || ''}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={user.email || ''}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Role"
                  value={getRoleLabel(user.role)}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Account Type:</strong> {getRoleLabel(user.role)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {user.role === 'owner'
                  ? 'As a property owner, you can create and manage rental listings.'
                  : 'As a tenant, you can browse listings and report inappropriate content.'
                }
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {message && (
        <Alert severity="success" sx={{ mt: 3 }}>
          {message}
        </Alert>
      )}
    </Box>
  );
};

export default UserProfile;
