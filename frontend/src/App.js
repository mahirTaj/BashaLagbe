import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Listings from './listings';
import AddEditListing from './pages/AddEditListing';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

function Nav() {
  const { user, switchUser } = useAuth();
  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
  <Toolbar sx={{ maxWidth: 1400, width: '100%', mx: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mr: 2 }}>BashaLagbe</Typography>
        <Button component={Link} to="/" color="inherit">My Listings</Button>
        <Button component={Link} to="/add" variant="contained" sx={{ ml: 1 }}>Add Listing</Button>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ px: 1, py: 0.5, borderRadius: 999, bgcolor: 'grey.100', border: 1, borderColor: 'divider', fontWeight: 600 }}>{user.name}</Typography>
          <IconButton size="small" onClick={switchUser} sx={{ border: 1, borderColor: 'divider' }}>↺</IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Listings />} />
      <Route path="/add" element={<AddEditListing />} />
      <Route path="/edit/:id" element={<AddEditListing />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#7c3aed' },
    },
    shape: { borderRadius: 8 },
    typography: { fontSize: 13 },
    components: {
      MuiTextField: { defaultProps: { size: 'small', margin: 'dense' } },
      MuiFormControl: { defaultProps: { size: 'small', margin: 'dense' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiButton: { defaultProps: { size: 'small' } },
      MuiToggleButton: { defaultProps: { size: 'small' } },
      MuiCheckbox: { defaultProps: { size: 'small' } },
      MuiIconButton: { defaultProps: { size: 'small' } },
      MuiCardContent: { styleOverrides: { root: { padding: 12, '&:last-child': { paddingBottom: 12 } } } },
      MuiCardActions: { styleOverrides: { root: { padding: '8px 12px' } } },
      MuiToolbar: { defaultProps: { variant: 'dense' } },
    },
  });
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Nav />
          <Box sx={{ maxWidth: 1400, mx: 'auto', p: 2 }}>
            <AppRoutes />
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
