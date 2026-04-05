import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { PasswordInput } from '../components/PasswordInput';

export function ResetPasswordPage() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const token       = params.get('token') ?? '';
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [loading,   setLoading]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      toast.success('Password reset! You can now log in.');
      navigate('/login');
    } catch (e: any) {
      toast.error(e.message ?? 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="page" style={{ maxWidth: 400, paddingTop: 80 }}>
      <p style={{ color: 'var(--red)' }}>Invalid reset link.</p>
      <Link to="/login">Back to login</Link>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 400, paddingTop: 80 }}>
      <h1 className="page-title">Set new password</h1>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">New password</label>
          <PasswordInput value={password} onChange={setPassword} minLength={8} required autoFocus
            placeholder="Min. 8 characters" autoComplete="new-password" />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm new password</label>
          <PasswordInput value={password2} onChange={setPassword2} minLength={8} required
            placeholder="••••••••" autoComplete="new-password" />
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
