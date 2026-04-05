import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api';
import { updateSocketAuth } from '../socket';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login:    (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout:   () => void;
  refreshCredits: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [token, setToken]       = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.me(token)
      .then(({ user: u }) => { setUser(u); updateSocketAuth(token); })
      .catch(() => { setToken(null); localStorage.removeItem('token'); })
      .finally(() => setLoading(false));
  }, []);

  const save = (t: string, u: User) => {
    setToken(t);
    setUser(u);
    localStorage.setItem('token', t);
    updateSocketAuth(t);
  };

  const login    = async (username: string, pw: string) => {
    const { token: t, user: u } = await api.login(username, pw);
    save(t, u);
  };

  const register = async (username: string, pw: string, email?: string) => {
    const { token: t, user: u } = await api.register(username, pw, email);
    save(t, u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    updateSocketAuth('');
  };

  const refreshCredits = async () => {
    if (!token) return;
    const { user: u } = await api.me(token);
    setUser(u);
  };

  return (
    <Ctx.Provider value={{ user, token, isLoading, login, register, logout, refreshCredits }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
