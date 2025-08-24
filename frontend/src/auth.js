import React, { createContext, useContext, useState } from 'react';

// Two dummy users for now with roles
const USERS = [
  { id: 'user_a', name: 'Alice', role: 'landlord', token: 'token_a' },
  { id: 'user_b', name: 'Bob', role: 'tenant', token: 'token_b' },
];

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [idx, setIdx] = useState(0);
  const [role, setRole] = useState(USERS[idx].role);
  const user = USERS[idx] || { name: 'Guest' };
  const switchUser = () => setIdx((i) => (i === 0 ? 1 : 0));
  const setUserRole = (r) => setRole(r);

  const value = { user, switchUser, role, setUserRole, token: USERS[idx].token };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
