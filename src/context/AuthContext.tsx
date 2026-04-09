import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api';
import { socket, updateSocketAuth } from '../socket';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  creditsReady: boolean;
  login:    (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string, refCode?: string) => Promise<void>;
  logout:   () => void;
  refreshCredits: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function loadCachedUser(): User | null {
  try { return JSON.parse(localStorage.getItem('user') ?? 'null'); } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(loadCachedUser);
  const [token, setToken]       = useState<string | null>(localStorage.getItem('token'));
  // If we have a cached user, don't show loading spinner — render immediately
  const [isLoading, setLoading] = useState(!loadCachedUser());
  const [creditsReady, setCreditsReady] = useState(loadCachedUser() !== null);

  const setAndCacheUser = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else   localStorage.removeItem('user');
  };

  useEffect(() => {
    if (!token) { setAndCacheUser(null); setLoading(false); return; }

    let cancelled = false;
    const tryMe = async (attemptsLeft: number, delay: number) => {
      try {
        const { user: u } = await api.me(token);
        if (cancelled) return;
        setAndCacheUser(u); setCreditsReady(true); updateSocketAuth(token);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        if (e?.status === 401) {
          // Real invalid token — log out
          setToken(null); setAndCacheUser(null); localStorage.removeItem('token');
          setLoading(false);
        } else if (attemptsLeft > 0) {
          // Network error (server restarting) — retry after delay, keep showing cached user
          setTimeout(() => tryMe(attemptsLeft - 1, Math.min(delay * 2, 8000)), delay);
        } else {
          // All retries exhausted — give up, keep cached user if any
          setLoading(false);
        }
      }
    };
    tryMe(6, 1000); // up to ~30s total retry window
    return () => { cancelled = true; };
  }, []);

  const save = (t: string, u: User) => {
    setToken(t);
    setAndCacheUser(u);
    localStorage.setItem('token', t);
    updateSocketAuth(t);
  };

  const login    = async (username: string, pw: string) => {
    const { token: t, user: u } = await api.login(username, pw);
    save(t, u);
  };

  const register = async (username: string, pw: string, email?: string, refCode?: string) => {
    const { token: t, user: u } = await api.register(username, pw, email, refCode);
    save(t, u);
  };

  const logout = () => {
    setToken(null);
    setAndCacheUser(null);
    localStorage.removeItem('token');
    updateSocketAuth('');
  };

  const refreshCredits = async () => {
    if (!token) return;
    try {
      const { user: u } = await api.me(token);
      setAndCacheUser(u);
      setCreditsReady(true);
    } catch { /* network hiccup — keep cached user */ }
  };

  useEffect(() => {
    const onCredits = ({ real, bonus }: { real: number; bonus: number }) => {
      setUser((u) => {
        const updated = u ? { ...u, credits: real, bonusCredits: bonus } : u;
        if (updated) localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
      setCreditsReady(true);
    };
    socket.on('credits-update', onCredits);
    return () => { socket.off('credits-update', onCredits); };
  }, []);

  return (
    <Ctx.Provider value={{ user, token, isLoading, creditsReady, login, register, logout, refreshCredits }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
