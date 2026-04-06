import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePing } from '../hooks/usePing';

export function Header() {
  const { user, logout, creditsReady } = useAuth();
  const { status, latencyMs } = usePing();

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
        <Link to="/" className="header-logo">
          penny<strong>Bid</strong>
        </Link>

        {user && (
          <>
            <nav className="header-nav">
              <NavLink to="/"              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>Auctions</NavLink>
              <NavLink to="/account"       className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Account</NavLink>
              <NavLink to="/how-it-works"  className={({ isActive }) => isActive ? 'nav-link nav-link--secondary active' : 'nav-link nav-link--secondary'}>How it works</NavLink>
            </nav>

            <div className="header-right">
              <a href="#" className="header-x-link" title="Follow us on X" onClick={e => e.preventDefault()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <Link to="/account#deposit" className="header-credits" data-pulse={pulse} style={{ textDecoration: 'none' }}>
                <span className={`ping-dot ping-dot--${status}`} title={`${status}${pingLabel ? ` · ${pingLabel}` : ''}`} />
                <span className="credits-value">{creditsReady ? user.credits + (user.bonusCredits ?? 0) : '—'}</span>
                <span className="credits-label">credits</span>
              </Link>
              <button className="btn-ghost" onClick={logout}>Sign out</button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
