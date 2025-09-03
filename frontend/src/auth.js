import { createContext, useContext, useState, useEffect } from 'react';

// Two dummy users for now
const USERS = [
  { _id: 'user_a', id: 'user_a', name: 'Alice' },
  { _id: 'user_b', id: 'user_b', name: 'Bob' },
];

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [idx, setIdx] = useState(0);

  const user = USERS[idx];
  const switchUser = () => setIdx((i) => (i === 0 ? 1 : 0));

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      const foundIdx = USERS.findIndex((u) => u.id === savedUserId);
      if (foundIdx !== -1) setIdx(foundIdx);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('userId', user.id);
  }, [user.id]);

  const value = { user, switchUser };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getToken() {
  return localStorage.getItem('token');
}
