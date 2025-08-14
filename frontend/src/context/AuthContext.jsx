import { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, me as apiMe } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const fetchMe = async () => {
    try {
      const data = await apiMe();
      setUser(data.user);
    } catch {
      logout();
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchMe();
    else setReady(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}