import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { usePing } from '../hooks/usePing';

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

export function Header() {
  const { user, logout, creditsReady } = useAuth();
  const { status, latencyMs } = usePing();
  const { theme, toggle } = useTheme();

  // Pulse animation when credits change
  const prevCredits = useRef<number | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (user === null) { prevCredits.current = null; return; }
    if (prevCredits.current !== null && prevCredits.current !== user.credits) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      return () => clearTimeout(t);
    }
    prevCredits.current = user.credits;
  }, [user?.credits]);

  const pingLabel = latencyMs != null ? `${latencyMs}ms` : '';

  return (
    <header className="header">
      <div className="header-inner">
        <Link to={user ? '/auctions' : '/'} className="header-logo">
          penny<strong>Bid</strong>
        </Link>

        <nav className="header-nav">
          <NavLink to="/auctions"     className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Auctions</NavLink>
          <NavLink to="/how-it-works" className={({ isActive }) => isActive ? 'nav-link nav-link--secondary active' : 'nav-link nav-link--secondary'}>How it works</NavLink>
              <NavLink to="/penny"        className={({ isActive }) => isActive ? 'nav-link nav-link--penny active' : 'nav-link nav-link--penny'}>$penny</NavLink>
          <NavLink to="/brand"        className={({ isActive }) => isActive ? 'nav-link nav-link--secondary active' : 'nav-link nav-link--secondary'}>Brand</NavLink>
        </nav>

        <div className="header-right">
          <button className="header-theme-btn" onClick={toggle} title="Toggle theme">
            {theme === 'dark'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>
          <a href="#" className="header-x-link" title="Follow us on X" onClick={e => e.preventDefault()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>

          {user ? (
            <>
              {user.refCode && (
                <button
                  className="header-ref-btn"
                  title="Copy your referral link"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.refCode}`);
                    toast.success('Referral link copied!');
                  }}
                >
                  Refer
                </button>
              )}
              <Link to="/account" className="header-user" style={{ textDecoration: 'none' }}>
                <span className="header-username">{user.username}</span>
              </Link>
              <Link to="/account#deposit" className="header-credits" data-pulse={pulse} style={{ textDecoration: 'none' }}>
                <span className={`ping-dot ping-dot--${status}`} title={`${status}${pingLabel ? ` · ${pingLabel}` : ''}`} />
                <span className="credits-value">{creditsReady ? user.credits + (user.bonusCredits ?? 0) : '—'}</span>
                <span className="credits-label">credits</span>
              </Link>
              <button className="btn-ghost" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="header-user" style={{ textDecoration: 'none' }}>
                <span className="header-username">Login</span>
              </Link>
              <div className="header-credits" style={{ opacity: 0.4 }}>
                <span className="credits-value">—</span>
                <span className="credits-label">credits</span>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
