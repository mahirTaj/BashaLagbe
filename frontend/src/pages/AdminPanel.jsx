import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Avatar,
  Chip,
  Paper
} from '@mui/material';
import {
  Dashboard,
  Report,
  VerifiedUser,
  Block,
  Settings,
  Logout,
  TrendingUp,
  People,
  Home,
  Assessment,
  CloudUpload
} from '@mui/icons-material';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { adminLogout } = useAdminAuth();

  const adminCards = [
    {
      title: 'Review Reports',
      description: 'Review and moderate reported listings and users',
      icon: <Report sx={{ fontSize: 40, color: '#ff6b6b' }} />,
      count: 'No reports',
      color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
      action: 'Review Now',
      path: '/admin-panel/reports'
    },
    {
      title: 'Verify Listings',
      description: 'Approve or reject new property submissions',
      icon: <VerifiedUser sx={{ fontSize: 40, color: '#4ecdc4' }} />,
      count: 'No pending',
      color: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
      action: 'Verify Now',
      path: '/admin-panel/verify'
    },
    {
      title: 'Block Users',
      description: 'Manage user accounts and enforce platform rules',
      icon: <Block sx={{ fontSize: 40, color: '#feca57' }} />,
      count: 'No flagged users',
      color: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
      action: 'Manage Users',
      path: '/admin-panel/users'
    },
    {
      title: 'Web Scraping Upload',
      description: 'Upload and process scraped property data from external sources',
      icon: <CloudUpload sx={{ fontSize: 40, color: '#667eea' }} />,
      count: '145 Files Available',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      action: 'Upload Data',
      path: '/admin-panel/web-scraping'
    },
    {
      title: 'Analytics',
      description: 'View platform statistics and performance metrics',
      icon: <Assessment sx={{ fontSize: 40, color: '#4facfe' }} />,
      count: 'View stats',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      action: 'View Analytics',
      path: '/admin-panel/analytics'
    }
    ,{
      title: 'Scraped Data',
      description: 'Browse stored scraped rental samples (analytics dataset)',
      icon: <Assessment sx={{ fontSize: 40, color: '#00b894' }} />,
      count: 'Dataset',
      color: 'linear-gradient(135deg, #00b894 0%, #55efc4 100%)',
      action: 'Open Dataset',
      path: '/admin-panel/scraped-data'
    }
  ];

  const handleCardClick = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    adminLogout();
    navigate('/admin-login');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 4
    }}>
      {/* Header */}
      <Paper elevation={0} sx={{ 
        p: 3, 
        mb: 4, 
        borderRadius: 3,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              width: 64, 
              height: 64, 
              mr: 3 
            }}>
              <Dashboard fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Admin Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Welcome back, Super Admin • BashaLagbe Management Portal
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label="Online" 
              color="success" 
              size="small" 
              sx={{ fontWeight: 600 }}
            />
            <IconButton onClick={handleLogout} color="error">
              <Logout />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <TrendingUp sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
            <Typography variant="h4" fontWeight={700} color="#4caf50">-</Typography>
            <Typography variant="body2" color="text.secondary">Total Properties</Typography>
          </Paper>
        </Grid>
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <People sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
            <Typography variant="h4" fontWeight={700} color="#2196f3">-</Typography>
            <Typography variant="body2" color="text.secondary">Active Users</Typography>
          </Paper>
        </Grid>
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Home sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
            <Typography variant="h4" fontWeight={700} color="#ff9800">-</Typography>
            <Typography variant="body2" color="text.secondary">Pending Approvals</Typography>
          </Paper>
        </Grid>
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Report sx={{ fontSize: 40, color: '#f44336', mb: 1 }} />
            <Typography variant="h4" fontWeight={700} color="#f44336">-</Typography>
            <Typography variant="body2" color="text.secondary">Open Reports</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Admin Action Cards */}
    <Grid container spacing={3}>
        {adminCards.map((card, index) => (
      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <Card 
              elevation={6}
              sx={{ 
                borderRadius: 4, 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 25px rgba(0,0,0,0.15)'
                }
              }}
              onClick={() => handleCardClick(card.path)}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 3,
                  background: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}>
                  {card.icon}
                </Box>
                
                <Typography variant="h6" fontWeight={700} mb={1}>
                  {card.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {card.description}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip 
                    label={card.count} 
                    size="small" 
                    sx={{ 
                      fontWeight: 600,
                      background: card.color,
                      color: 'white'
                    }}
                  />
                  <Button 
                    variant="outlined" 
                    size="small"
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    {card.action}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AdminPanel;
