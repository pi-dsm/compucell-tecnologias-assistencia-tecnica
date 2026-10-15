import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updatePreferences = async (patch) => {
    setUser((prev) => {
      const next = { ...prev, preferences: { ...prev?.preferences, ...patch } };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
    try {
      await api.patch('/auth/me/preferences', patch);
    } catch {
    }
  };

  return (
    <AuthCtx.Provider value={{ token, user, login, logout, updatePreferences, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthCtx.Provider>
  );
}