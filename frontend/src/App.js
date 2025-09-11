import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Listings from './listings';
import AddEditListing from './pages/AddEditListing';
import Browse from './pages/Browse';
import ListingDetails from './pages/ListingDetails';
import MoveInScheduler from './pages/MoveInScheduler';
import MapPage from './pages/Map';
import { AuthProvider, useAuth } from './auth';
import OAuthSuccess from './pages/OAuthSuccess';
import AuthDebug from './components/AuthDebug';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ExploreIcon from '@mui/icons-material/Explore';
import MapIcon from '@mui/icons-material/Map';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Avatar from '@mui/material/Avatar';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(148,163,184,0.25)',
  transition: 'border-color .2s ease, background .2s ease',
  marginLeft: theme.spacing(1),
  marginRight: theme.spacing(1),
  width: '100%',
  '&:hover': { borderColor: 'rgba(148,163,184,0.4)' },
  '&:focus-within': { borderColor: 'rgba(250,204,21,0.7)', background: 'rgba(250,204,21,0.06)' },
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(2),
    width: 'auto',
    minWidth: '320px',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(226,232,240,0.8)'
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.1, 1, 1.1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    fontSize: '0.95rem',
    fontWeight: 500,
    '&::placeholder': { color: 'rgba(226,232,240,0.7)', opacity: 1 },
    [theme.breakpoints.up('sm')]: { width: '22ch', '&:focus': { width: '28ch' } },
  },
}));

const LogoBox = styled(Box)(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.spacing(1.25), cursor: 'pointer',
  transition: 'transform .15s ease', userSelect: 'none', position: 'relative', zIndex: 10,
  '&:hover': { transform: 'scale(1.02)' }, '&:active': { transform: 'scale(0.99)' },
}));

export function NavBar() {
  const { user, logout } = useAuth();
  const admin = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const qParam = params.get('q') || '';
  const [searchVal, setSearchVal] = useState(qParam);

  // Navigate to profile if logged in, otherwise to login
  const switchUser = () => {
    if (user && user._id) navigate('/profile');
    else navigate('/login');
  };

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
    <AppBar position="sticky" elevation={0} sx={{ 
      background: 'linear-gradient(180deg, rgba(11,17,30,0.85), rgba(11,17,30,0.72))',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(148,163,184,0.2)',
      boxShadow: '0 10px 30px rgba(2,6,23,0.35)'
    }}>
      <Toolbar sx={{ px: { xs: 1.5, sm: 3 }, minHeight: '76px !important' }}>
        {/* Logo and Brand */}
        <LogoBox onClick={() => navigate('/')}> 
          <Box sx={{
            width: 46, height: 46, borderRadius: '50%', padding: '2px',
            background: 'linear-gradient(135deg,#d4af37,#facc15)',
          }}>
            <Box sx={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'rgba(2,6,23,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(234,179,8,0.35)',
            }}>
              <Typography component="span" sx={{
                fontFamily: '"Poppins", sans-serif', fontWeight: 800, fontSize: 16, letterSpacing: '0.06em',
                color: '#fef3c7', textShadow: '0 1px 2px rgba(0,0,0,0.4)', pointerEvents: 'none'
              }}>BL</Typography>
            </Box>
          </Box>
          <Typography variant="h6" noWrap sx={{
            ml: 1, fontFamily: '"Poppins", sans-serif', fontWeight: 700,
            letterSpacing: '.06em', color: '#e5e7eb', textDecoration: 'none', fontSize: '1.3rem',
            pointerEvents: 'none'
          }}>BashaLagbe</Typography>
        </LogoBox>

        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1, display: 'flex', ml: 4 }}>
          <Button onClick={() => navigate('/listings')} sx={{ mr: 1, color: '#fff' }} startIcon={<ViewListIcon />}>My Listings</Button>
          <Button onClick={() => navigate('/browse')} sx={{ mr: 1, color: '#fff' }} startIcon={<ExploreIcon />}>Browse</Button>
          <Button onClick={() => navigate('/map')} sx={{ mr: 1, color: '#fff' }} startIcon={<MapIcon />}>Map</Button>
          <Button onClick={() => { if (admin && admin.isAdminLoggedIn) navigate('/admin-panel'); else navigate('/admin-login'); }} sx={{ ml: 2, color: '#facc15', border: '1px solid rgba(250,204,21,0.4)' }}>Admin</Button>
        </Box>

        {/* Search */}
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <form onSubmit={onFormSubmit} style={{ width: '100%' }}>
            <StyledInputBase
              placeholder="Search rentals..."
              inputProps={{ 'aria-label': 'search' }}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </form>
        </Search>

        {/* User */}
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          <IconButton onClick={switchUser} sx={{ color: '#e5e7eb', '&:hover': { color: '#fff' } }} aria-label="account">
            {user?.profilePic ? (
              <Avatar src={user.profilePic.startsWith('http') ? user.profilePic : `http://localhost:5000${user.profilePic}`} sx={{ width: 34, height: 34 }} />
            ) : (
              <AccountCircleIcon />
            )}
          </IconButton>
          <Typography variant="body2" sx={{ color: 'rgba(248,250,252,0.9)', ml: 1, display: { xs: 'none', sm: 'block' } }}>
            {user?.name || ''}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function AppRoutes() {
  // Lazy import to avoid circular dependency
  const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
  const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
  const WebScrapingUpload = React.lazy(() => import('./pages/WebScrapingUpload'));
  const DataValidationInterface = React.lazy(() => import('./pages/DataValidationInterface'));
  const ScrapedData = React.lazy(() => import('./pages/MarketSamples'));
  const Analytics = React.lazy(() => import('./pages/Analytics'));
  
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
      <Route path="/movein" element={<MoveInScheduler />} />
      <Route path="/listing/:id" element={<ListingDetails />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/admin-login" element={
        <React.Suspense fallback={<div>Loading...</div>}>
          <AdminLogin />
        </React.Suspense>
      } />
      <Route path="/admin-panel" element={
        <React.Suspense fallback={<div>Loading...</div>}>
          <ProtectedAdminRoute>
            <AdminPanel />
          </ProtectedAdminRoute>
        </React.Suspense>
      } />
      <Route path="/admin-panel/web-scraping" element={
        <React.Suspense fallback={<div>Loading...</div>}>
          <ProtectedAdminRoute>
            <WebScrapingUpload />
          </ProtectedAdminRoute>
        </React.Suspense>
      } />
      <Route path="/admin-panel/data-validation" element={
        <React.Suspense fallback={<div>Loading...</div>}>
          <ProtectedAdminRoute>
            <DataValidationInterface />
          </ProtectedAdminRoute>
        </React.Suspense>
      } />
      <Route path="/admin-panel/scraped-data" element={
        <React.Suspense fallback={<div>Loading...</div>}>
          <ProtectedAdminRoute>
            <ScrapedData />
          </ProtectedAdminRoute>
        </React.Suspense>
      } />
      <Route path="/admin-panel/analytics" element={
        <React.Suspense fallback={<div>Loading...</div>}>
          <ProtectedAdminRoute>
            <Analytics />
          </ProtectedAdminRoute>
        </React.Suspense>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

// Protect admin-only routes
function ProtectedAdminRoute({ children }) {
  const admin = useAdminAuth();
  if (admin.isLoading) return <div>Loading...</div>;
  return admin.isAdminLoggedIn ? children : <Navigate to="/admin-login" />;
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
      MuiToggleButton: {
        defaultProps: { size: 'medium' },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10,
            borderColor: 'rgba(99,102,241,0.35)',
            backgroundColor: 'rgba(99,102,241,0.06)',
            color: '#374151',
            transition: 'background-color .2s ease, box-shadow .2s ease, transform .2s ease',
            '&:hover': { backgroundColor: 'rgba(99,102,241,0.12)' },
            '&.Mui-selected': {
              background: 'linear-gradient(135deg,#4f46e5,#6366f1 55%,#7c3aed)',
              borderColor: 'rgba(99,102,241,0.6)',
              color: '#f8fafc',
              boxShadow: '0 8px 18px rgba(79,70,229,0.28)',
            },
            '&.Mui-selected:hover': {
              background: 'linear-gradient(135deg,#4f46e5,#6366f1 55%,#7c3aed)'
            }
          }
        }
      },
      MuiCheckbox: { defaultProps: { size: 'medium' } },
      MuiIconButton: { defaultProps: { size: 'medium' } },
      MuiButtonBase: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiButton: {
        styleOverrides: {
          root: { paddingInline: 20, minHeight: 44, borderRadius: 12, fontWeight: 700 },
          containedPrimary: {
            background: 'linear-gradient(135deg,#4f46e5,#6366f1 55%,#7c3aed)',
            boxShadow: '0 10px 28px rgba(79,70,229,0.35)',
            color: '#f8fafc',
            '&:hover': {
              background: 'linear-gradient(135deg,#4f46e5,#6366f1 55%,#7c3aed)',
              boxShadow: '0 16px 36px rgba(124,58,237,0.42)'
            }
          },
          outlinedPrimary: {
            borderColor: 'rgba(99,102,241,0.6)',
            color: '#1f2937',
            backgroundColor: '#ffffff',
            '&:hover': {
              borderColor: 'rgba(99,102,241,0.8)',
              backgroundColor: 'rgba(99,102,241,0.08)'
            }
          }
        }
      },
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
      <AdminAuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <NavBar />
            <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
              <AppRoutes />
            </Box>
          </BrowserRouter>
        </ThemeProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}
