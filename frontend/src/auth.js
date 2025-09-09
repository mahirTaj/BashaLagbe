import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

// Configure axios base URL
// In production (served by the backend), use same origin by default.
// In local dev without env, fallback to http://localhost:5000.
const API_BASE = process.env.REACT_APP_API_BASE_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:5000');
axios.defaults.baseURL = API_BASE;

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const expiry = localStorage.getItem('authTokenExpiry');
    if (token && expiry && Number(expiry) > Date.now()) {
      // Removed: axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const decoded = jwtDecode(token);
        setUser({ id: decoded.sub, role: decoded.role });
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const register = async ({ name, email, password, role }) => {
    try {
      const res = await axios.post('/api/auth/register', { name, email, password, role });
      const { token, user } = res.data || {};
      if (token) {
        let expiry = Date.now() + 24 * 60 * 60 * 1000;
        try { const d = jwtDecode(token); if (d && d.exp) expiry = d.exp * 1000; } catch {}
        localStorage.setItem('authToken', token);
        localStorage.setItem('authTokenExpiry', expiry.toString());
        // Removed: axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const login = async ({ email, password }) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const { token, user } = res.data || {};
      if (token) {
        let expiry = Date.now() + 24 * 60 * 60 * 1000;
        try { const d = jwtDecode(token); if (d && d.exp) expiry = d.exp * 1000; } catch {}
        localStorage.setItem('authToken', token);
        localStorage.setItem('authTokenExpiry', expiry.toString());
        // Removed: axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenExpiry');
    // Removed: delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Remove global 401 interceptor that was causing automatic logout
  // Individual components can handle 401s as needed

  return (
    <AuthCtx.Provider value={{ user, isLoading, register, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
