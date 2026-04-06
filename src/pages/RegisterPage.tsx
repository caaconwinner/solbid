import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') ?? undefined;
  const [username, setUsername] = useState('');
  const [pw, setPw]             = useState('');
  const [pw2, setPw2]           = useState('');
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await register(username, pw, email || undefined, refCode);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">penny<strong>Bid</strong></div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">A Solana wallet is generated automatically for you.</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="letters, numbers, underscores"
              autoComplete="username"
              minLength={3}
              maxLength={24}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <PasswordInput
              value={pw}
              onChange={setPw}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <PasswordInput
              value={pw2}
              onChange={setPw2}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Email <span className="form-label-optional">(optional — for password recovery only)</span>
            </label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <p className="form-hint">
              If you forget your password and haven't added an email, you'll need to create a new account.
            </p>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
