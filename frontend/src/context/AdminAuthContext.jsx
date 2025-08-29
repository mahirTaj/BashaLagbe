import React, { createContext, useContext, useState, useEffect } from 'react';

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
      const expiryTime = parseInt(adminExpiry);
      
      if (now < expiryTime) {
        setIsAdminLoggedIn(true);
      } else {
        // Token expired, clean up
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminTokenExpiry');
      }
    }
    setIsLoading(false);
  }, []);

  const adminLogin = (username, password) => {
    // TODO: Replace with real API call
    if (username === 'superadmin' && password === 'admin123') {
      const token = 'admin_' + Date.now(); // Simple token for demo
      const expiry = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours
      
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminTokenExpiry', expiry.toString());
      setIsAdminLoggedIn(true);
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenExpiry');
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
