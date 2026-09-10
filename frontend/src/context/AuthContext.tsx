import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('atharv_token') || localStorage.getItem('mira_token');
    const savedUser = localStorage.getItem('atharv_user') || localStorage.getItem('mira_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify with /me
        authService.me().then(u => {
          setUser(u);
          localStorage.setItem('atharv_user', JSON.stringify(u));
        }).catch(() => {
          localStorage.removeItem('atharv_token');
          localStorage.removeItem('atharv_user');
          localStorage.removeItem('mira_token');
          localStorage.removeItem('mira_user');
          setUser(null);
        }).finally(() => setLoading(false));
      } catch (e) {
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('atharv_token', token);
    localStorage.setItem('atharv_user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('atharv_token');
    localStorage.removeItem('atharv_user');
    localStorage.removeItem('mira_token');
    localStorage.removeItem('mira_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
