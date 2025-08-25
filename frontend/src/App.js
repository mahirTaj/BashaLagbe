import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Listings from './listings';
import AddEditListing from './pages/AddEditListing';
import Browse from './pages/Browse';
import ListingDetails from './pages/ListingDetails';
import { AuthProvider, useAuth } from './auth';
import OAuthSuccess from './pages/OAuthSuccess';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import axios from 'axios';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

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
    <div className="nav">
      <span className="nav-title" onClick={() => navigate('/')}>BashaLagbe</span>
      <Link to="/listings">My Listings</Link>
      <Link to="/browse" style={{ marginLeft: 8 }}>Browse</Link>
      <Link to="/profile" style={{ marginLeft: 8 }}>Profile</Link>
      <Link to="/add" className="btn" style={{ marginLeft: 8 }}>Add Listing</Link>
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
        <span className="user-chip">{user?.name || 'Guest'}</span>
        <button className="icon-btn" onClick={switchUser}>Switch</button>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth / profile / listing management (protected) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/listings" element={
        <ProtectedRoute>
          <Listings />
        </ProtectedRoute>
      } />
      <Route path="/add" element={
        <ProtectedRoute>
          <AddEditListing />
        </ProtectedRoute>
      } />
      <Route path="/edit/:id" element={
        <ProtectedRoute>
          <AddEditListing />
        </ProtectedRoute>
      } />
      <Route path="/oauth-success" element={<OAuthSuccess />} />

      {/* Public browse */}
      <Route path="/" element={<Listings />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/listing/:id" element={<ListingDetails />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function AppContent() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Only show Nav if not on login page and user is authenticated
  const showNav = token && location.pathname !== '/login';
  return (
    <>
      {showNav && (
        <div className="toolbar">
          <Nav />
        </div>
      )}
      <div className="container">
        <AppRoutes />
      </div>
    </>
  );
}

export default function App() {
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#7c3aed' },
    },
    shape: { borderRadius: 12 },
    typography: {
      htmlFontSize: 16,
      fontSize: 16,
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontSize: '1.05rem', fontWeight: 600 },
      body1: { fontSize: '1rem' },
      body2: { fontSize: '0.95rem' },
    },
    components: {
      MuiTextField: { defaultProps: { size: 'medium', margin: 'dense' } },
      MuiFormControl: { defaultProps: { size: 'medium', margin: 'dense' } },
      MuiSelect: { defaultProps: { size: 'medium' } },
      MuiButton: { defaultProps: { size: 'medium' } },
      MuiToggleButton: { defaultProps: { size: 'medium' } },
      MuiCheckbox: { defaultProps: { size: 'medium' } },
      MuiIconButton: { defaultProps: { size: 'medium' } },
      MuiButtonBase: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiButton: { styleOverrides: { root: { paddingInline: 20, minHeight: 44 } } },
      MuiChip: { styleOverrides: { root: { fontSize: '0.75rem', height: 28 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
      MuiCardContent: { styleOverrides: { root: { padding: 16, '&:last-child': { paddingBottom: 16 } } } },
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
          {/* AppContent handles conditional Nav rendering based on authentication */}
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
