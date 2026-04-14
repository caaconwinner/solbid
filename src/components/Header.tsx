import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { usePing } from '../hooks/usePing';
import { useXNotification } from '../hooks/useXNotification';

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
  const { hasNew, dismiss } = useXNotification();
  const location = useLocation();

  // Pulse animation when credits change
  const prevCredits = useRef<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user === null) { prevCredits.current = null; return; }
    if (prevCredits.current !== null && prevCredits.current !== user.credits) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      return () => clearTimeout(t);
    }
    prevCredits.current = user.credits;
  }, [user?.credits]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const pingLabel = latencyMs != null ? `${latencyMs}ms` : '';
  const close = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to={user ? '/auctions' : '/'} className="header-logo">
          penny<strong>Bid</strong>
        </Link>

        <nav className="header-nav">
          <NavLink to="/auctions"     className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Auctions</NavLink>
          <NavLink to="/how-it-works" className={({ isActive }) => isActive ? 'nav-link nav-link--secondary active' : 'nav-link nav-link--secondary'}>How it works</NavLink>
          <NavLink to="/faq"          className={({ isActive }) => isActive ? 'nav-link nav-link--secondary active' : 'nav-link nav-link--secondary'}>FAQ</NavLink>
          <NavLink to="/penny"        className={({ isActive }) => isActive ? 'nav-link nav-link--penny active' : 'nav-link nav-link--penny'}>$penny</NavLink>
          <NavLink to="/refer"        className={({ isActive }) => isActive ? 'nav-link nav-link--secondary active' : 'nav-link nav-link--secondary'}>Refer</NavLink>
          <NavLink to="/slots"        className={({ isActive }) => isActive ? 'nav-link nav-link--slots active' : 'nav-link nav-link--slots'}>Slots</NavLink>
          <NavLink to="/brand"        className={({ isActive }) => isActive ? 'nav-link nav-link--secondary active' : 'nav-link nav-link--secondary'}>Brand</NavLink>
          <NavLink to="/account"      className={({ isActive }) => isActive ? 'nav-link nav-link--secondary active' : 'nav-link nav-link--secondary'}>Account</NavLink>
        </nav>

        <div className="header-right">
          <button className="header-theme-btn" onClick={toggle} title="Toggle theme">
            {theme === 'dark'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>
          <a
            href="https://x.com/pennyBid_"
            target="_blank"
            rel="noreferrer"
            className="header-x-link"
            title="Follow @pennyBid_ on X"
            onClick={dismiss}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            {hasNew && <span className="header-x-badge">1</span>}
          </a>

          {user ? (
            <>
              {user.refCode && (
                <button
                  className="header-ref-btn header-ref-btn--desktop"
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
              <button className="btn-ghost header-signout--desktop" onClick={logout}>Sign out</button>
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

          {/* Hamburger — mobile only */}
          <button
            className="header-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className="mobile-menu-overlay" onClick={close} />
          <nav className="mobile-menu">
            <NavLink to="/auctions"     className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
              {/* Gavel — auction */}
              <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4l6 6-10 10H4v-6L14 4z"/><line x1="14" y1="4" x2="20" y2="10"/>
              </svg>
              Auctions
            </NavLink>

            <NavLink to="/how-it-works" className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
              <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              How it works
            </NavLink>

            <NavLink to="/faq" className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
              <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              FAQ
            </NavLink>

            <NavLink to="/penny" className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
              {/* Coin with $ — $penny token */}
              <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v2m0 8v2m-3-7h4.5a1.5 1.5 0 0 1 0 3H9a1.5 1.5 0 0 0 0 3H13"/>
              </svg>
              $penny
            </NavLink>

            <NavLink to="/refer" className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
              {/* Person + arrow right — referral */}
              <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="23" y2="12"/><line x1="23" y1="8" x2="19" y2="12"/>
              </svg>
              Refer a friend
            </NavLink>

            <NavLink to="/slots" className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
              {/* Slot machine */}
              <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <line x1="8" y1="4" x2="8" y2="20"/>
                <line x1="16" y1="4" x2="16" y2="20"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
              </svg>
              Slots
            </NavLink>

            <NavLink to="/brand" className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
              {/* Diamond — brand assets */}
              <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 19 9 12 22 5 9 12 2"/>
                <line x1="5" y1="9" x2="19" y2="9"/>
              </svg>
              Brand
            </NavLink>

            <div className="mobile-menu-divider" />

            {user ? (
              <>
                <NavLink to="/account" className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
                  {/* Wallet — account */}
                  <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h2"/><path d="M2 10h20"/>
                  </svg>
                  Account
                </NavLink>
                {user.refCode && (
                  <button className="mobile-menu-link mobile-menu-link--btn" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.refCode}`);
                    toast.success('Referral link copied!');
                    close();
                  }}>
                    {/* Chain links — copy referral */}
                    <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    Copy referral link
                  </button>
                )}
                <button className="mobile-menu-link mobile-menu-link--btn mobile-menu-link--danger" onClick={() => { logout(); close(); }}>
                  {/* Arrow out of box — sign out */}
                  <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`} onClick={close}>
                  <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Login
                </NavLink>
                <NavLink to="/register" className={({ isActive }) => `mobile-menu-link mobile-menu-link--cta${isActive ? ' active' : ''}`} onClick={close}>
                  <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/>
                  </svg>
                  Create account
                </NavLink>
              </>
            )}
          </nav>
        </>
      )}
    </header>
  );
}
