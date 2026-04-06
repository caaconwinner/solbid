import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';

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
    <div className="auth-page auth-page--trio">
      {/* ── Card 1: Login ── */}
      <div className="auth-card">
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

      {/* ── Card 2: How it works ── */}
      <Link to="/how-it-works" className="auth-nav-card">
        <div className="auth-nav-card-icon">📖</div>
        <div className="auth-nav-card-title">How it works</div>
        <div className="auth-nav-card-body">
          Learn how penny auctions work — bids, timers, winning, and the cashback raffle.
        </div>
        <div className="auth-nav-card-steps">
          <div className="auth-nav-card-step">① Deposit SOL → get bid credits</div>
          <div className="auth-nav-card-step">② Bid to raise the price by $0.01</div>
          <div className="auth-nav-card-step">③ Last bidder at 0:00 wins</div>
        </div>
        <div className="auth-nav-card-cta">Read more →</div>
      </Link>

      {/* ── Card 3: Auctions ── */}
      <Link to="/auctions" className="auth-nav-card">
        <div className="auth-nav-card-icon">🏷️</div>
        <div className="auth-nav-card-title">Auctions</div>
        <div className="auth-nav-card-body">
          Browse live and upcoming auctions — no account needed to watch.
        </div>
        <div className="auth-nav-card-steps">
          <div className="auth-nav-card-step">🟢 Live auctions with real-time prices</div>
          <div className="auth-nav-card-step">🕐 Upcoming scheduled auctions</div>
          <div className="auth-nav-card-step">🏆 Recently ended &amp; winners</div>
        </div>
        <div className="auth-nav-card-cta">View auctions →</div>
      </Link>
    </div>
  );
}
