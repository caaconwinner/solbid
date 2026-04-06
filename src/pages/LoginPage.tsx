import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';
import { api } from '../api';
import { useTimer } from '../hooks/useTimer';
import type { AuctionListing } from '../types';

// ── Mini live timer for the auction preview card ─────────────────
function MiniTimer({ endsAtMs, status }: { endsAtMs: number; status: string }) {
  const ms      = useTimer(status === 'active' ? endsAtMs : null, 0);
  const seconds = ms / 1000;
  if (status === 'scheduled') return <span className="lp-auction-status lp-auction-status--upcoming">UPCOMING</span>;
  if (status === 'ended' || status === 'settled') return <span className="lp-auction-status lp-auction-status--ended">ENDED</span>;
  const urgent = seconds <= 15;
  return (
    <span className="lp-auction-timer" data-urgent={urgent}>
      {seconds >= 60
        ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
        : `${seconds.toFixed(1)}s`}
    </span>
  );
}

// ── Auction preview card (right-bottom) ──────────────────────────
function AuctionPreviewCard() {
  const [auction, setAuction] = useState<AuctionListing | null>(null);

  useEffect(() => {
    const fetch = () =>
      api.auctionsPublic().then(({ auctions }) => {
        // prefer live, then upcoming, then any
        const live = auctions.find(a => a.status === 'active');
        const upcoming = auctions.find(a => a.status === 'scheduled');
        setAuction(live ?? upcoming ?? auctions[0] ?? null);
      }).catch(() => {});
    fetch();
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

  // Static mockup when no auction loaded yet
  const mockup = !auction;

  return (
    <Link to="/auctions" className="lp-side-card lp-side-card--auction">
      <div className="lp-side-card-label">AUCTIONS</div>

      <div className="lp-auction-preview">
        {mockup ? (
          <div className="lp-auction-mock-img">🎮</div>
        ) : (
          <img
            className="lp-auction-img"
            src={auction!.item.image}
            alt={auction!.item.name}
          />
        )}

        <div className="lp-auction-info">
          <div className="lp-auction-name">
            {mockup ? 'PS5 Console' : auction!.item.name}
          </div>
          <div className="lp-auction-row">
            <span className="lp-auction-price">
              ${mockup ? '0.13' : auction!.currentPrice.toFixed(2)}
            </span>
            {mockup
              ? <span className="lp-auction-timer">2:47</span>
              : <MiniTimer endsAtMs={auction!.endsAtMs} status={auction!.status} />
            }
          </div>
          <div className="lp-auction-bids">
            {mockup ? '13' : auction!.totalBids} bids placed
          </div>
        </div>
      </div>

      <div className="lp-side-card-cta">View all auctions →</div>
    </Link>
  );
}

// ── Login page ───────────────────────────────────────────────────
export function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [username, setUsername] = useState('');
  const [pw, setPw]             = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, pw);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setShowForgot(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-layout">
      {/* ── Left: Login card ── */}
      <div className="auth-card lp-login-card">
        <div className="auth-logo">penny<strong>Bid</strong></div>
        <h1 className="auth-title">Sign in</h1>

        <form className="auth-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <PasswordInput
              value={pw}
              onChange={setPw}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="form-error">
              {error}
              {showForgot && (
                <> — <Link to="/forgot-password" style={{ color: 'var(--orange)' }}>Forgot password?</Link></>
              )}
            </p>
          )}

          <button className="btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
        <p className="auth-switch">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </div>

      {/* ── Right column ── */}
      <div className="lp-right-col">
        {/* Top: How it works */}
        <Link to="/how-it-works" className="lp-side-card lp-side-card--hiw">
          <div className="lp-side-card-label">LEARN</div>
          <div className="lp-hiw-book">📖</div>
          <div className="lp-hiw-title">How it works?</div>
          <div className="lp-hiw-body">
            Learn how penny auctions work — bids, timers, and winning.
          </div>
          <div className="lp-side-card-cta">Read more →</div>
        </Link>

        {/* Bottom: Auction preview */}
        <AuctionPreviewCard />
      </div>
    </div>
  );
}
