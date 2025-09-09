import React, { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import Listings from './listings';
import AddEditListing from './pages/AddEditListing';
import Browse from './pages/Browse';
import ListingDetails from './pages/ListingDetails';
// Removed public Login and Register from routing (admin uses basic login flow)
import MapPage from './pages/Map';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './auth';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ExploreIcon from '@mui/icons-material/Explore';
import MapIcon from '@mui/icons-material/Map';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReportIcon from '@mui/icons-material/Report';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Analytics from './pages/Analytics';
import RentalTrends from './pages/RentalTrends';
import RentTrendsDashboard from './components/RentTrendsDashboard';
import CompareAreas from './pages/CompareAreas';
// Removed heatmap page
import UserReports from './pages/UserReports';
import UserProfile from './pages/UserProfile';
import ReportForm from './pages/ReportForm';

// Lazy import to avoid circular dependency
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const AdminReports = React.lazy(() => import('./pages/AdminReports'));
const WebScrapingUpload = React.lazy(() => import('./pages/WebScrapingUpload'));
const DataValidationInterface = React.lazy(() => import('./pages/DataValidationInterface'));
const ScrapedData = React.lazy(() => import('./pages/MarketSamples'));
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

const NavButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(0, 0.5), borderRadius: 10, textTransform: 'none', fontWeight: 600,
  fontSize: '0.95rem', color: 'rgba(248,250,252,0.9)', padding: theme.spacing(0.8, 1.25),
  position: 'relative', overflow: 'visible', background: 'transparent',
  '&:hover': { background: 'transparent', color: '#fff' },
  '&::after': {
    content: '""', position: 'absolute', left: 10, right: 10, bottom: 4, height: 2,
    background: 'linear-gradient(90deg,#facc15,#fde68a)', borderRadius: 2, transform: 'scaleX(0)',
    transformOrigin: 'left', transition: 'transform .25s ease', opacity: 0.85,
  },
  '&:hover::after': { transform: 'scaleX(1)' },
  '&[data-active="true"]': { color: '#fff' },
  '&[data-active="true"]::after': { transform: 'scaleX(1)' },
}));

function Nav() {
  const { user, logout } = useAuth();
  const { isAdminLoggedIn, adminLogout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const qParam = params.get('q') || '';
  const [searchVal, setSearchVal] = useState(qParam);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  // keep input synced when navigating back/forward
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (qParam !== searchVal) setSearchVal(qParam); }, [qParam]);

  const handleAdminClick = () => {
    if (user?.role === 'admin' || isAdminLoggedIn) {
      navigate('/admin-panel');
    } else {
      navigate('/login');
    }
  };

  const submitSearch = () => {
    const p = new URLSearchParams(location.search);
    if (searchVal.trim()) p.set('q', searchVal.trim()); else p.delete('q');
    navigate({ pathname: '/browse', search: p.toString() });
  };

  // onFormSubmit and clearSearch were unused; removed to clear warnings

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    // Ensure any admin session is also cleared
    try { adminLogout(); } catch {}
    navigate('/');
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <AssessmentIcon />; // or AdminPanelSettings from MUI icons if preferred
    if (role === 'owner') return <BusinessIcon />;
    return <PersonIcon />;
  };

  const getRoleColor = (role) => {
    if (role === 'admin') return '#f59e0b'; // amber/gold for admin
    if (role === 'owner') return '#4ade80';
    return '#60a5fa';
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Admin';
    if (role === 'owner') return 'Property Owner';
    return 'Tenant';
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
          <NavButton startIcon={<ViewListIcon />} onClick={() => navigate('/')} data-active={location.pathname === '/'}>
            My Listings
          </NavButton>
          <NavButton startIcon={<ExploreIcon />} onClick={() => navigate('/browse')} data-active={location.pathname.startsWith('/browse')}>
            Browse
          </NavButton>
          <NavButton startIcon={<MapIcon />} onClick={() => navigate('/map')} data-active={location.pathname.startsWith('/map')}>
            Map
          </NavButton>
          <NavButton startIcon={<AssessmentIcon />} onClick={() => navigate('/trends')} data-active={location.pathname.startsWith('/trends')}>
            Trends
          </NavButton>
          {/* Admin panel link: visible only when an admin is logged in */}
          {(user?.role === 'admin' || isAdminLoggedIn) && (
            <NavButton onClick={handleAdminClick} data-active={location.pathname.startsWith('/admin')} sx={{ ml: 2, fontWeight: 700, color: '#4ade80', border: '1px solid #4ade80', borderRadius: 2 }}>
              Admin Panel
            </NavButton>
          )}
        </Box>

        {/* Search */}
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <form onSubmit={(e) => { e.preventDefault(); submitSearch(); }} style={{ width: '100%' }}>
            <StyledInputBase
              placeholder="Search rentals..."
              inputProps={{ 'aria-label': 'search' }}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </form>
        </Search>

  {/* User actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          {user ? (
            <>
              {/* Report Button */}
              <IconButton
                color="inherit"
                onClick={() => navigate('/report-form')}
                sx={{
                  mr: 1,
                  color: 'rgba(248,250,252,0.8)',
                  '&:hover': {
                    color: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)'
                  }
                }}
                title="Submit a Report"
              >
                <ReportIcon />
              </IconButton>

              {/* User Profile Section */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 1,
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
                onClick={handleUserMenuOpen}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: getRoleColor(user.role),
                    mr: 1.5
                  }}
                >
                  {getRoleIcon(user.role)}
                </Avatar>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(248,250,252,0.9)',
                      fontWeight: 600,
                      lineHeight: 1.2
                    }}
                  >
                    {user.name || user.email}
                  </Typography>
                  <Chip
                    label={getRoleLabel(user.role)}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.7rem',
                      backgroundColor: getRoleColor(user.role),
                      color: 'white',
                      fontWeight: 600,
                      mt: 0.5
                    }}
                  />
                </Box>
              </Box>

              {/* User Menu */}
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 2
                  }
                }}
              >
                <Box sx={{ p: 2, pb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
                    {user.name || 'User'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(248,250,252,0.7)' }}>
                    {user.email}
                  </Typography>
                  <Chip
                    label={getRoleLabel(user.role)}
                    size="small"
                    sx={{
                      mt: 1,
                      backgroundColor: getRoleColor(user.role),
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>
                <Divider sx={{ borderColor: 'rgba(148,163,184,0.2)' }} />
                <MenuItem
                  onClick={() => {
                    handleUserMenuClose();
                    navigate('/profile');
                  }}
                  sx={{
                    color: 'rgba(248,250,252,0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <PersonIcon sx={{ mr: 1.5, fontSize: 18 }} />
                  My Profile
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleUserMenuClose();
                    navigate('/report-form');
                  }}
                  sx={{
                    color: 'rgba(248,250,252,0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <ReportIcon sx={{ mr: 1.5, fontSize: 18 }} />
                  Submit Report
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleUserMenuClose();
                    navigate('/reports');
                  }}
                  sx={{
                    color: 'rgba(248,250,252,0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <ReportIcon sx={{ mr: 1.5, fontSize: 18 }} />
                  My Reports
                </MenuItem>
                <Divider sx={{ borderColor: 'rgba(148,163,184,0.2)' }} />
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    color: '#ef4444',
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)'
                    }
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            // Show a single Login button when no user or admin is logged in
            !isAdminLoggedIn && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/login')}
                sx={{ ml: 1 }}
              >
                Login
              </Button>
            )
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

// Create a root layout so Nav shows on every page and routes render in Outlet
function RootLayout() {
  return (
    <>
      <Nav />
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
        <Outlet />
      </Box>
    </>
  );
}

// Build the router with v7 future flags to opt-in early and silence deprecation warnings
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: <Listings /> },
        { path: 'browse', element: <Browse /> },
        { path: 'listing/:id', element: <ListingDetails /> },
        { path: 'add', element: <AddEditListing /> },
        { path: 'edit/:id', element: <AddEditListing /> },
        { path: 'map', element: <MapPage /> },
        { path: 'trends', element: <RentalTrends /> },
  { path: 'compare-areas', element: <CompareAreas /> },
  { path: 'trends-dashboard', element: <RentTrendsDashboard /> },
  { path: 'login', element: <Login /> },
  { path: 'register', element: <Register /> },
        { path: 'admin-login', element: <React.Suspense fallback={<div>Loading...</div>}><AdminLogin /></React.Suspense> },
        { path: 'admin-panel', element: <React.Suspense fallback={<div>Loading...</div>}><ProtectedAdminRoute><AdminPanel /></ProtectedAdminRoute></React.Suspense> },
        { path: 'admin-panel/reports', element: <React.Suspense fallback={<div>Loading...</div>}><ProtectedAdminRoute><AdminReports /></ProtectedAdminRoute></React.Suspense> },
        { path: 'admin-panel/web-scraping', element: <React.Suspense fallback={<div>Loading...</div>}><ProtectedAdminRoute><WebScrapingUpload /></ProtectedAdminRoute></React.Suspense> },
        { path: 'admin-panel/data-validation', element: <React.Suspense fallback={<div>Loading...</div>}><ProtectedAdminRoute><DataValidationInterface /></ProtectedAdminRoute></React.Suspense> },
        { path: 'admin-panel/scraped-data', element: <React.Suspense fallback={<div>Loading...</div>}><ProtectedAdminRoute><ScrapedData /></ProtectedAdminRoute></React.Suspense> },
        { path: 'admin-panel/analytics', element: <React.Suspense fallback={<div>Loading...</div>}><ProtectedAdminRoute><Analytics /></ProtectedAdminRoute></React.Suspense> },
        { path: 'report-form', element: <ReportForm /> },
        { path: 'reports', element: <UserReports /> },
        { path: 'profile', element: <UserProfile /> },
        { path: '*', element: <Navigate to="/" /> }
      ]
    }
  ],
  {
    future: { v7_relativeSplatPath: true, v7_startTransition: true }
  }
);

// Protected route component for admin pages
function ProtectedAdminRoute({ children }) {
  const { isAdminLoggedIn, isLoading } = useAdminAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAdminLoggedIn) {
  return <Navigate to="/login" replace />;
  }
  
  return children;
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
  // consolidated in styleOverrides below
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
      MuiCardActions: { styleOverrides: { root: { padding: '8px 12px' } } },
      MuiToolbar: { defaultProps: { variant: 'dense' } },
    },
  });
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </ThemeProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}
