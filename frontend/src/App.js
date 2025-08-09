import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Listings from './listings';
import AddEditListing from './pages/AddEditListing';
import { AuthProvider, useAuth } from './auth';

function Nav() {
  const { user, switchUser } = useAuth();
  return (
    <div className="nav">
      <span className="nav-title">BashaLagbe</span>
      <Link to="/">My Listings</Link>
      <Link to="/add" className="btn" style={{ marginLeft: 8 }}>Add Listing</Link>
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
