import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Listings from './listings';
import AddEditListing from './pages/AddEditListing';
import Browse from './pages/Browse';
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
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const qParam = params.get('q') || '';
  const [searchVal, setSearchVal] = useState(qParam);

  // keep input synced when navigating back/forward
  useEffect(() => { if (qParam !== searchVal) setSearchVal(qParam); /* eslint-disable-next-line */ }, [qParam]);

  const submitSearch = () => {
    const p = new URLSearchParams(location.search);
    if (searchVal.trim()) p.set('q', searchVal.trim()); else p.delete('q');
    navigate({ pathname: '/browse', search: p.toString() });
  };

  const onFormSubmit = (e) => { e.preventDefault(); submitSearch(); };

  const clearSearch = () => {
    setSearchVal('');
    const p = new URLSearchParams(location.search); p.delete('q');
    navigate({ pathname: '/browse', search: p.toString() });
  };

  return (
<<<<<<< HEAD
    <div className="nav">
      <span className="nav-title" onClick={() => navigate('/')}>BashaLagbe</span>
      <Link to="/">My Listings</Link>
      <Link to="/browse" style={{ marginLeft: 8 }}>Browse</Link>
      <form className="nav-search-form" onSubmit={onFormSubmit}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search rentals..."
          aria-label="Search rentals"
        />
        {searchVal && <button type="button" className="icon-btn clear" onClick={clearSearch} aria-label="Clear" title="Clear">×</button>}
        <button type="submit" className="btn sm" aria-label="Search">Search</button>
      </form>
      <div className="nav-spacer">
        <span className="user-chip">{user.name}</span>
        <button className="icon-btn" onClick={switchUser}>Switch</button>
      </div>
    </div>
=======
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
>>>>>>> main
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Listings />} />
  <Route path="/browse" element={<Browse />} />
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
