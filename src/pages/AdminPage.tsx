import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'admin_token';

interface AdminAuction {
  auctionId:   string;
  item:        { name: string; image: string; retailValue: number };
  status:      string;
  totalBids:   number;
  endsAtMs:    number;
  snapTimerMs: number;
  _durationMs: number;
  prize:       { type: string; amount?: number; code?: string; description?: string } | null;
}

function api(token: string, path: string, opts?: RequestInit) {
  return fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
  }).then(async (r) => {
    const body = await r.json();
    if (!r.ok) throw new Error(body.message ?? 'Request failed');
    return body;
  });
}

function fmtMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Login screen ──────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (t: string) => void }) {
  const [token, setToken] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(token, '/api/admin/auctions');
      localStorage.setItem(STORAGE_KEY, token);
      onLogin(token);
    } catch {
      toast.error('Invalid admin token');
    }
  };

  return (
    <div className="page" style={{ maxWidth: 380, paddingTop: 80 }}>
      <h1 className="page-title">Admin</h1>
      <form onSubmit={submit} className="admin-login-form">
        <input
          className="form-input"
          type="password"
          placeholder="Admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
        />
        <button className="btn-primary" type="submit">Sign in</button>
      </form>
    </div>
  );
}

// ─── Create form ───────────────────────────────────────────────
function CreateAuctionForm({ token, onCreated }: { token: string; onCreated: () => void }) {
  const now = new Date();
  now.setSeconds(0, 0);
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [name,        setName]        = useState('');
  const [image,       setImage]       = useState('');
  const [retailValue, setRetailValue] = useState('');
  const [startAt,     setStartAt]     = useState(localNow);
  const [durationMin, setDurationMin] = useState('30');
  const [snapSec,     setSnapSec]     = useState('15');
  const [prizeType,   setPrizeType]   = useState<'physical'|'digital'|'sol'>('physical');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [prizeCode,   setPrizeCode]   = useState('');
  const [prizeDesc,   setPrizeDesc]   = useState('');
  const [saving,      setSaving]      = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(token, '/api/admin/auction', {
        method: 'POST',
        body: JSON.stringify({
          name, image, retailValue: Number(retailValue), startAt,
          durationMinutes: Number(durationMin), snapTimerSeconds: Number(snapSec),
          prizeType, prizeAmount, prizeCode, prizeDescription: prizeDesc,
        }),
      });
      toast.success('Auction created');
      setName(''); setImage(''); setRetailValue(''); setPrizeAmount(''); setPrizeCode(''); setPrizeDesc('');
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={submit}>
      <h2 className="admin-section-title">New Auction</h2>

      <div className="admin-form-grid">
        <div className="form-group">
          <label className="form-label">Item name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. MacBook Pro 14&quot;" required />
        </div>

        <div className="form-group">
          <label className="form-label">Retail value (USD)</label>
          <input className="form-input" type="number" min={1} value={retailValue}
            onChange={(e) => setRetailValue(e.target.value)} placeholder="999" required />
        </div>

        <div className="form-group admin-col-span">
          <label className="form-label">Image URL</label>
          <input className="form-input" value={image} onChange={(e) => setImage(e.target.value)}
            placeholder="https://…" required />
          {image && (
            <img src={image} alt="preview" className="admin-img-preview"
              onError={(e) => (e.currentTarget.style.display = 'none')}
              onLoad={(e)  => (e.currentTarget.style.display = 'block')} />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Start time</label>
          <input className="form-input" type="datetime-local" value={startAt}
            onChange={(e) => setStartAt(e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input className="form-input" type="number" min={1} max={1440} value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Snap-timer threshold (seconds)</label>
          <p className="form-hint" style={{ marginBottom: 6 }}>Bids reset timer only when ≤ this many seconds remain.</p>
          <input className="form-input" type="number" min={5} max={300} value={snapSec}
            onChange={(e) => setSnapSec(e.target.value)} required />
        </div>

        <div className="form-group admin-col-span">
          <label className="form-label">Prize type</label>
          <div className="admin-prize-tabs">
            {(['physical','digital','sol'] as const).map((t) => (
              <button key={t} type="button"
                className={`tx-tab ${prizeType === t ? 'tx-tab--active' : ''}`}
                onClick={() => setPrizeType(t)}>
                {t === 'sol' ? 'SOL' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {prizeType === 'physical' && (
            <input className="form-input" style={{ marginTop: 8 }} value={prizeDesc}
              onChange={(e) => setPrizeDesc(e.target.value)}
              placeholder="e.g. MacBook Pro 14″ — we will contact you to arrange delivery" required />
          )}
          {prizeType === 'digital' && (
            <input className="form-input" style={{ marginTop: 8 }} value={prizeCode}
              onChange={(e) => setPrizeCode(e.target.value)}
              placeholder="Gift card / download code" required />
          )}
          {prizeType === 'sol' && (
            <input className="form-input" style={{ marginTop: 8 }} type="number" min={0.01} step={0.01}
              value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)}
              placeholder="SOL amount e.g. 1.0" required />
          )}
        </div>
      </div>

      <button className="btn-primary" type="submit" disabled={saving}>
        {saving ? 'Creating…' : 'Create auction'}
      </button>
    </form>
  );
}

// ─── Edit form (inline) ────────────────────────────────────────
function EditForm({ token, auction, onDone }: { token: string; auction: AdminAuction; onDone: () => void }) {
  const toLocal = (ms: number) =>
    new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const startMs = auction.endsAtMs - auction._durationMs;
  const [name,        setName]        = useState(auction.item.name);
  const [image,       setImage]       = useState(auction.item.image);
  const [retailValue, setRetailValue] = useState(String(auction.item.retailValue));
  const [startAt,     setStartAt]     = useState(toLocal(startMs));
  const [durationMin, setDurationMin] = useState(String(Math.round(auction._durationMs / 60000)));
  const [snapSec,     setSnapSec]     = useState(String(Math.round(auction.snapTimerMs / 1000)));
  const [saving,      setSaving]      = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(token, `/api/admin/auction/${auction.auctionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, image, retailValue: Number(retailValue), startAt, durationMinutes: Number(durationMin), snapTimerSeconds: Number(snapSec) }),
      });
      toast.success('Saved');
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-edit-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <div className="form-group">
          <label className="form-label">Item name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Retail value (USD)</label>
          <input className="form-input" type="number" min={1} value={retailValue} onChange={(e) => setRetailValue(e.target.value)} required />
        </div>
        <div className="form-group admin-col-span">
          <label className="form-label">Image URL</label>
          <input className="form-input" value={image} onChange={(e) => setImage(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Start time</label>
          <input className="form-input" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input className="form-input" type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Snap-timer (seconds)</label>
          <input className="form-input" type="number" min={5} value={snapSec} onChange={(e) => setSnapSec(e.target.value)} required />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button className="btn-ghost" type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Auction list ──────────────────────────────────────────────
function AuctionList({ token, auctions, onRefresh }: {
  token: string; auctions: AdminAuction[]; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api(token, `/api/admin/auction/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (auctions.length === 0) return <p className="dash-empty">No auctions yet.</p>;

  return (
    <div className="admin-auction-list">
      {auctions.map((a) => (
        <div key={a.auctionId}>
          <div className="admin-auction-row">
            <img src={a.item.image} alt={a.item.name} className="admin-auction-thumb" />
            <div className="admin-auction-info">
              <span className="admin-auction-name">{a.item.name}</span>
              <span className="admin-auction-meta">
                ${a.item.retailValue.toLocaleString()} · {fmtMs(a._durationMs)} · snap {fmtMs(a.snapTimerMs)} · {a.totalBids} bids
                {a.prize && <> · Prize: <strong>{a.prize.type === 'sol' ? `${a.prize.amount} SOL` : a.prize.type}</strong></>}
              </span>
              <span className="admin-auction-meta">
                {a.status === 'scheduled'
                  ? `Starts ${new Date(a.endsAtMs - a._durationMs).toLocaleString()}`
                  : a.status === 'active'
                  ? `Ends ${new Date(a.endsAtMs).toLocaleString()}`
                  : 'Ended'}
              </span>
            </div>
            <span className={`tx-badge tx-badge--${a.status === 'active' ? 'deposit' : a.status === 'ended' ? 'withdraw' : 'bid'}`}>
              {a.status}
            </span>
            {a.status !== 'active' && (
              <button className="btn-ghost" style={{ flexShrink: 0 }}
                onClick={() => setEditing(editing === a.auctionId ? null : a.auctionId)}>
                {editing === a.auctionId ? 'Close' : 'Edit'}
              </button>
            )}
            <button className="btn-ghost admin-del-btn" onClick={() => del(a.auctionId, a.item.name)}>
              Delete
            </button>
          </div>
          {editing === a.auctionId && (
            <EditForm token={token} auction={a} onDone={() => { setEditing(null); onRefresh(); }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────
export function AdminPage() {
  const [token,    setToken]    = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [auctions, setAuctions] = useState<AdminAuction[]>([]);

  const load = () => {
    if (!token) return;
    api(token, '/api/admin/auctions')
      .then(({ auctions: a }) => setAuctions(a))
      .catch(() => { setToken(''); localStorage.removeItem(STORAGE_KEY); });
  };

  useEffect(load, [token]);

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <div className="page page-narrow">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Admin</h1>
        <button className="btn-ghost" onClick={() => { setToken(''); localStorage.removeItem(STORAGE_KEY); }}>
          Sign out
        </button>
      </div>

      <section className="dash-section">
        <CreateAuctionForm token={token} onCreated={load} />
      </section>

      <section className="dash-section">
        <h2 className="admin-section-title">All Auctions <button className="btn-ghost" style={{ fontSize: 12, padding: '2px 8px' }} onClick={load}>Refresh</button></h2>
        <AuctionList token={token} auctions={auctions} onRefresh={load} />
      </section>
    </div>
  );
}
