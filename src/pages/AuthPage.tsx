import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';

// ── Tab nav bar (shared across auth pages) ────────────────────────
export function AuthTabBar({ active }: { active: 'login' | 'hiw' | 'auctions' }) {
  return (
    <div className="auth-tabs">
      <Link
        to="/login"
        className="auth-tab-btn"
        data-active={active === 'login'}
      >
        Sign in
      </Link>
      <Link
        to="/how-it-works"
        className="auth-tab-btn"
        data-active={active === 'hiw'}
      >
        How it works
      </Link>
      <Link
        to="/auctions"
        className="auth-tab-btn"
        data-active={active === 'auctions'}
      >
        Auctions
      </Link>
    </div>
  );
}

// ── Login page with tab bar ───────────────────────────────────────
export function AuthPage() {
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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">penny<strong>Bid</strong></div>

        <AuthTabBar active="login" />

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
    </div>
  );
}
