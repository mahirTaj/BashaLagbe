import { createContext, useContext, useState, useEffect } from 'react';

// Two dummy users for now
const USERS = [
  { id: 'user_a', name: 'Alice' },
  { id: 'user_b', name: 'Bob' },
];


const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [idx, setIdx] = useState(0);

  // ✅ Keep existing dummy behaviour
  const user = USERS[idx];
  const switchUser = () => setIdx((i) => (i === 0 ? 1 : 0));

  // 🔹 Load from localStorage if present (non‑intrusive)
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      const foundIdx = USERS.findIndex((u) => u.id === savedUserId);
      if (foundIdx !== -1) setIdx(foundIdx);
    }
  }, []);

  // 🔹 Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('userId', user.id);
  }, [user.id]);

  // expose user id for API calls
  const value = { user, switchUser };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}