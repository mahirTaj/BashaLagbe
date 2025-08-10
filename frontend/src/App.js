import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Listings from './listings';
import AddEditListing from './pages/AddEditListing';
import { AuthProvider, useAuth } from './auth';
import OAuthSuccess from './pages/OAuthSuccess';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';

function Nav() {
  const { user, switchUser } = useAuth();
  return (
    <div className="nav">
      <span className="nav-title">BashaLagbe</span>
      <Link to="/listings">My Listings</Link>
      <Link to="/profile" style={{ marginLeft: 8 }}>Profile</Link> {/* Add this line */}
      <Link to="/add" className="btn" style={{ marginLeft: 8 }}>Add Listing</Link>
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> {/* Add this line */}
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
      <Route path="/" element={<Navigate to="/profile" />} />
      <Route path="*" element={<Navigate to="/login" />} />
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
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
