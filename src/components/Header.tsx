import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePing } from '../hooks/usePing';

export function Header() {
  const { user, logout } = useAuth();
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
              <Link to="/account#deposit" className="header-credits" data-pulse={pulse} style={{ textDecoration: 'none' }}>
                <span className={`ping-dot ping-dot--${status}`} title={`${status}${pingLabel ? ` · ${pingLabel}` : ''}`} />
                <span className="credits-value">{user.credits + (user.bonusCredits ?? 0)}</span>
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
