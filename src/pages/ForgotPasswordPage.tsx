import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';

export function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="page" style={{ maxWidth: 400, paddingTop: 80 }}>
      <h1 className="page-title">Check your email</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        If an account with that email exists, we sent a reset link. Check your inbox.
      </p>
      <Link to="/login" className="btn-primary" style={{ display: 'inline-block' }}>Back to login</Link>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 400, paddingTop: 80 }}>
      <h1 className="page-title">Forgot password</h1>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            required
          />
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
        <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
          Back to login
        </Link>
      </form>
    </div>
  );
}
