import React, { createContext, useContext, useState } from 'react';

// Two dummy users for now
const USERS = [
  { id: 'user_a', name: 'Alice' },
  { id: 'user_b', name: 'Bob' },
];

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [idx, setIdx] = useState(0);
  const user = USERS[idx] || { name: 'Guest' };
  const switchUser = () => setIdx((i) => (i === 0 ? 1 : 0));

  const value = { user, switchUser };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
