import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Log 401 responses to help debug unexpected logouts
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // eslint-disable-next-line no-console
      console.warn('[Auth] axios received 401 response', err.response?.data || err.message);
      // Don't automatically clear token here — we want to observe behavior in logs first.
    }
    return Promise.reject(err);
  }
);

const AuthCtx = createContext(null);

const TOKEN_KEY = 'bl_token';

function setAuthHeader(token) {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete axios.defaults.headers.common['Authorization'];
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    setAuthHeader(token);
    if (token) {
      (async () => {
        try {
          // Debug: show token being used to fetch profile
          // eslint-disable-next-line no-console
          console.debug('[Auth] fetching profile with token:', token && token.slice ? token.slice(0, 8) + '...' : token);
          const res = await axios.get('/api/auth/profile');
          const u = res.data;
          // normalize id field
          if (u && u._id && !u.id) u.id = u._id;
          setUser(u);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch profile', err?.response?.data || err.message);
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, [token]);

  const saveToken = (t) => {
    if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY);
    setToken(t);
    setAuthHeader(t);
  };

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    const t = res.data.token;
    if (t) {
      saveToken(t);
      if (res.data.user) {
        const u = res.data.user;
        if (u && u._id && !u.id) u.id = u._id;
        setUser(u);
      } else {
        const prof = await axios.get('/api/auth/profile');
        const u = prof.data;
        if (u && u._id && !u.id) u.id = u._id;
        setUser(u);
      }
    }
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post('/api/auth/register', { name, email, password });
    const t = res.data.token;
    if (t) {
      saveToken(t);
      const prof = await axios.get('/api/auth/profile');
      const u = prof.data;
      if (u && u._id && !u.id) u.id = u._id;
      setUser(u);
    }
    return res.data;
  };

  const logout = () => {
    saveToken(null);
    setUser(null);
  };

  // expose a method to set token programmatically (used by OAuth redirect handler)
  return <AuthCtx.Provider value={{ user, loading, token, login, register, logout, setAuthToken: saveToken }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
