import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';

// ── Static mockup auction card ────────────────────────────────────
function MockAuctionCard() {
  return (
    <Link to="/auctions" className="lp-side-card lp-side-card--auction">
      <div className="lp-mock-card">
        <div className="lp-mock-img">🎮</div>
        <div className="lp-mock-body">
          <div className="lp-mock-name">PS5 Console</div>
          <div className="lp-mock-retail">Retail: <strong>$499</strong></div>
          <div className="lp-mock-row">
            <div>
              <div className="lp-mock-price-label">Current price</div>
              <div className="lp-mock-price">$0.13</div>
            </div>
            <div className="lp-mock-timer-wrap">
              <div className="lp-mock-timer-label">Time left</div>
              <div className="lp-mock-timer">2:47</div>
            </div>
          </div>
          <div className="lp-mock-bids">13 bids placed</div>
          <div className="lp-mock-bid-btn">Place Bid — 1 credit</div>
        </div>
      </div>
      <div className="lp-side-card-cta">View live auctions →</div>
    </Link>
  );
}

// ── Login page ────────────────────────────────────────────────────
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
          <div className="lp-hiw-book">📖</div>
          <div className="lp-hiw-title">
            How it <span style={{ color: 'var(--orange)' }}>works?</span>
          </div>
          <div className="lp-hiw-body">
            Learn how penny auctions work — bids, timers, and winning.
          </div>
          <div className="lp-side-card-cta">Read more →</div>
        </Link>

        {/* Bottom: Mockup auction */}
        <MockAuctionCard />
      </div>
    </div>
  );
}
