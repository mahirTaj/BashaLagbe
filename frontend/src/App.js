import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Listings from './listings';
import AddEditListing from './pages/AddEditListing';
import Browse from './pages/Browse';
import { AuthProvider, useAuth } from './auth';

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
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="toolbar">
          <Nav />
        </div>
        <div className="container">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
