import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

// Axios baseURL is set in auth.js

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing admin session on mount
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminExpiry = localStorage.getItem('adminTokenExpiry');

    if (adminToken && adminExpiry) {
      const now = new Date().getTime();
      const expiryTime = parseInt(adminExpiry, 10);

      if (now < expiryTime) {
        setIsAdminLoggedIn(true);
        // Removed: axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
        // Dev admin header for backend admin routes
        // Removed: axios.defaults.headers.common['admin-token'] = 'superadmin-token';
      } else {
        // Token expired, clean up
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminTokenExpiry');
        // Removed: delete axios.defaults.headers.common['Authorization'];
        // Removed: delete axios.defaults.headers.common['admin-token'];
      }
    }
    setIsLoading(false);
  }, []);

  const adminLogin = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email: (username || '').trim(), password: (password || '').trim() });
      const { token } = res.data || {};
      if (!token) return false;

      // decode expiry from token
      let decoded;
      try { decoded = jwtDecode(token); } catch (e) { decoded = null; }

      const expiry = decoded && decoded.exp ? decoded.exp * 1000 : (new Date().getTime() + (24 * 60 * 60 * 1000));

      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminTokenExpiry', expiry.toString());
      // Removed: axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Dev admin header for backend admin routes
      // Removed: axios.defaults.headers.common['admin-token'] = 'superadmin-token';
      setIsAdminLoggedIn(true);
      return true;
    } catch (e) {
      return false;
    }
  };

  const adminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenExpiry');
    // Removed: delete axios.defaults.headers.common['Authorization'];
    // Removed: delete axios.defaults.headers.common['admin-token'];
    setIsAdminLoggedIn(false);
  };

  const value = {
    isAdminLoggedIn,
    isLoading,
    adminLogin,
    adminLogout
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
