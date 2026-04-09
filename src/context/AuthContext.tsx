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
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const verify = async (): Promise<'ok' | 'retry' | 'logout'> => {
      try {
        const { user: u } = await api.me(token);
        if (cancelled) return 'ok';
        setAndCacheUser(u); setCreditsReady(true); updateSocketAuth(token);
        setLoading(false);
        return 'ok';
      } catch (e: any) {
        if (e?.status === 401) return 'logout';
        return 'retry';
      }
    };

    const tryMe = async (attemptsLeft: number, delay: number) => {
      if (cancelled) return;
      const result = await verify();
      if (result === 'ok') return;
      if (result === 'logout') {
        setToken(null); setAndCacheUser(null); localStorage.removeItem('token');
        setLoading(false);
        return;
      }
      // Network/server error
      if (attemptsLeft > 0) {
        setTimeout(() => tryMe(attemptsLeft - 1, Math.min(delay * 2, 8000)), delay);
      } else {
        // Retries exhausted — keep cached user, poll in background every 20s
        setLoading(false);
        pollTimer = setInterval(async () => {
          if (cancelled) { clearInterval(pollTimer!); return; }
          const r = await verify();
          if (r === 'logout') {
            clearInterval(pollTimer!);
            setToken(null); setAndCacheUser(null); localStorage.removeItem('token');
          } else if (r === 'ok') {
            clearInterval(pollTimer!);
          }
        }, 20_000);
      }
    };

    tryMe(8, 1000); // ~60s window before falling back to background poll
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
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
