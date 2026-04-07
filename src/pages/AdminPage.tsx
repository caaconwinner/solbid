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

interface AdminUser {
  id:            string;
  username:      string;
  email:         string | null;
  deposit_address: string;
  credits:       number;
  bonus_credits: number;
  ref_code:      string | null;
  ref_disabled:  number;
}

interface AdminWinner {
  id:             string;
  username:       string;
  depositAddress: string;
  itemName:       string;
  prizeType:      string;
  prizeData:      { type: string; amount?: number; code?: string; description?: string };
  finalPrice:     number;
  purchased:      boolean;
  purchaseSig:    string | null;
  ts:             number;
}

interface AdminReferral {
  id:           string;
  username:     string;
  refCode:      string;
  refDisabled:  boolean;
  signups:      number;
  creditsEarned: number;
}

const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3007');

function api(token: string, path: string, opts?: RequestInit) {
  return fetch(`${BASE}${path}`, {
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

function shortAddr(addr: string) {
  if (!addr) return '—';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
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
          name, image, retailValue: Number(retailValue),
          startAt: startAt ? new Date(startAt).toISOString() : null,
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

// ─── Users panel ───────────────────────────────────────────────
function UsersPanel({ token }: { token: string }) {
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [search,    setSearch]    = useState('');
  const [amounts,   setAmounts]   = useState<Record<string, string>>({});
  const [allAmount, setAllAmount] = useState('');
  const [loading,   setLoading]   = useState<string | null>(null);

  const load = () => api(token, '/api/admin/users').then(({ users: u }) => setUsers(u));
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const adjust = async (id: string, username: string) => {
    const amount = parseInt(amounts[id] ?? '0');
    if (!amount || isNaN(amount)) return toast.error('Enter a number');
    setLoading(id + '-credits');
    try {
      const { bonusCredits } = await api(token, `/api/admin/user/${id}/credits`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      toast.success(`${username}: bonus credits now ${bonusCredits}`);
      setAmounts((a) => ({ ...a, [id]: '' }));
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  const deleteUser = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This will remove their account, transactions, and wins. This cannot be undone.`)) return;
    setLoading(id + '-del');
    try {
      await api(token, `/api/admin/user/${id}`, { method: 'DELETE' });
      toast.success(`${username} deleted`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  const giveAll = async () => {
    const amount = parseInt(allAmount);
    if (!amount || isNaN(amount) || amount <= 0) return toast.error('Enter a positive number');
    setLoading('all');
    try {
      const { usersAffected } = await api(token, '/api/admin/credits/all', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      toast.success(`+${amount} bonus credits given to ${usersAffected} users`);
      setAllAmount('');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h2 className="admin-section-title">
        Users
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
          {users.length} registered
        </span>
      </h2>

      <div className="admin-toolbar">
        <input
          className="form-input admin-search"
          placeholder="Search username or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="form-input"
            type="number"
            min="1"
            style={{ width: 100, padding: '6px 10px' }}
            placeholder="Amount"
            value={allAmount}
            onChange={(e) => setAllAmount(e.target.value)}
          />
          <button className="btn-primary" disabled={loading === 'all'} onClick={giveAll}>
            Give all users bonus credits
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="tx-table admin-table" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Deposit address</th>
              <th>SOL cr.</th>
              <th>Bonus</th>
              <th style={{ width: 100 }}>Adjust bonus</th>
              <th style={{ width: 70 }}></th>
              <th style={{ width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.username}</strong></td>
                <td style={{ color: 'var(--text-muted)' }}>{u.email ?? '—'}</td>
                <td>
                  <span
                    className="admin-addr"
                    title={`Click to copy: ${u.deposit_address}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => { navigator.clipboard.writeText(u.deposit_address); toast.success('Address copied'); }}
                  >
                    {shortAddr(u.deposit_address)}
                  </span>
                </td>
                <td>{u.credits}</td>
                <td style={{ color: 'var(--orange)' }}>{u.bonus_credits}</td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    style={{ width: 90, padding: '4px 8px' }}
                    placeholder="+10 / -5"
                    value={amounts[u.id] ?? ''}
                    onChange={(e) => setAmounts((a) => ({ ...a, [u.id]: e.target.value }))}
                  />
                </td>
                <td>
                  <button
                    className="btn-primary"
                    style={{ padding: '4px 12px', fontSize: 13, whiteSpace: 'nowrap' }}
                    disabled={loading === u.id + '-credits'}
                    onClick={() => adjust(u.id, u.username)}
                  >
                    Apply
                  </button>
                </td>
                <td>
                  <button
                    className="btn-ghost admin-del-btn"
                    style={{ padding: '4px 10px', fontSize: 13 }}
                    disabled={loading === u.id + '-del'}
                    onClick={() => deleteUser(u.id, u.username)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        Showing {filtered.length} of {users.length} · bonus credits are bid-only, not redeemable for SOL
      </p>
    </div>
  );
}

// ─── Winners panel ─────────────────────────────────────────────
function WinnersPanel({ token }: { token: string }) {
  const [winners,  setWinners]  = useState<AdminWinner[]>([]);
  const [loading,  setLoading]  = useState<string | null>(null);

  const load = () => api(token, '/api/admin/winners').then(({ winners: w }) => setWinners(w));
  useEffect(() => { load(); }, []);

  const sendPrize = async (id: string, username: string, amount: number) => {
    if (!confirm(`Send ${amount} SOL prize to ${username}?`)) return;
    setLoading(id);
    try {
      const { sig } = await api(token, `/api/admin/winners/${id}/send-prize`, { method: 'POST' });
      toast.success(`Sent! tx: ${sig.slice(0, 12)}…`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  const markSent = async (id: string) => {
    setLoading(id);
    try {
      await api(token, `/api/admin/winners/${id}/mark-sent`, { method: 'POST' });
      toast.success('Marked as sent');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  if (winners.length === 0) return (
    <div>
      <h2 className="admin-section-title">Winners</h2>
      <p className="dash-empty">No winners yet.</p>
    </div>
  );

  return (
    <div>
      <h2 className="admin-section-title">
        Winners
        <button className="btn-ghost" style={{ fontSize: 12, padding: '2px 8px', marginLeft: 8 }} onClick={load}>Refresh</button>
      </h2>

      <div className="admin-table-wrap">
        <table className="tx-table admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Winner</th>
              <th>Item</th>
              <th>Prize</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {winners.map((w) => (
              <tr key={w.id}>
                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(w.ts).toLocaleDateString()}
                </td>
                <td>
                  <div><strong>{w.username}</strong></div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{shortAddr(w.depositAddress)}</div>
                </td>
                <td>{w.itemName}</td>
                <td>
                  {w.prizeType === 'sol' && (
                    <span style={{ color: 'var(--orange)' }}>{w.prizeData.amount} SOL</span>
                  )}
                  {w.prizeType === 'physical' && (
                    <span title={w.prizeData.description}>Physical</span>
                  )}
                  {w.prizeType === 'digital' && (
                    <span className="admin-code" title={w.prizeData.code}>Digital</span>
                  )}
                </td>
                <td>
                  {w.purchased ? (
                    <span className="tx-badge tx-badge--deposit">
                      {w.purchaseSig === 'admin-manual' ? 'Manual' : 'Sent'}
                    </span>
                  ) : (
                    <span className="tx-badge tx-badge--withdraw">Pending</span>
                  )}
                </td>
                <td>
                  {!w.purchased && w.prizeType === 'sol' && (
                    <button
                      className="btn-primary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={loading === w.id}
                      onClick={() => sendPrize(w.id, w.username, w.prizeData.amount!)}
                    >
                      {loading === w.id ? 'Sending…' : 'Send SOL'}
                    </button>
                  )}
                  {!w.purchased && w.prizeType !== 'sol' && (
                    <button
                      className="btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={loading === w.id}
                      onClick={() => markSent(w.id)}
                    >
                      Mark sent
                    </button>
                  )}
                  {w.purchased && w.purchaseSig && w.purchaseSig !== 'admin-manual' && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title={w.purchaseSig}>
                      {w.purchaseSig.slice(0, 10)}…
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Referrals panel ───────────────────────────────────────────
function ReferralsPanel({ token }: { token: string }) {
  const [referrals, setReferrals] = useState<AdminReferral[]>([]);
  const [loading,   setLoading]   = useState<string | null>(null);
  const [search,    setSearch]    = useState('');

  const load = () => api(token, '/api/admin/referrals').then(({ referrals: r }) => setReferrals(r));
  useEffect(() => { load(); }, []);

  const toggleDisable = async (r: AdminReferral) => {
    setLoading(r.id);
    try {
      await api(token, `/api/admin/user/${r.id}/ref-disable`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled: !r.refDisabled }),
      });
      toast.success(`${r.username}'s referral link ${r.refDisabled ? 'enabled' : 'disabled'}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  const filtered = referrals.filter(r =>
    r.username.toLowerCase().includes(search.toLowerCase()) ||
    r.refCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 className="admin-section-title">Referrals</h2>

      <input
        className="form-input admin-search"
        placeholder="Search username or code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <div className="admin-table-wrap">
        <table className="tx-table admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Ref code</th>
              <th>Signups</th>
              <th>Credits earned</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ opacity: r.refDisabled ? 0.5 : 1 }}>
                <td><strong>{r.username}</strong></td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{r.refCode}</td>
                <td>{r.signups}</td>
                <td style={{ color: r.creditsEarned > 0 ? 'var(--orange)' : undefined }}>
                  {r.creditsEarned > 0 ? `+${r.creditsEarned}` : '—'}
                </td>
                <td>
                  <span className={`tx-badge tx-badge--${r.refDisabled ? 'withdraw' : 'deposit'}`}>
                    {r.refDisabled ? 'Disabled' : 'Active'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 12, color: r.refDisabled ? 'var(--green)' : 'var(--red)' }}
                    disabled={loading === r.id}
                    onClick={() => toggleDisable(r)}
                  >
                    {r.refDisabled ? 'Enable' : 'Disable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        {filtered.length} of {referrals.length} users
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────
type Tab = 'auctions' | 'users' | 'winners' | 'referrals';

export function AdminPage() {
  const [token,    setToken]    = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [auctions, setAuctions] = useState<AdminAuction[]>([]);
  const [tab,      setTab]      = useState<Tab>('auctions');

  const loadAuctions = () => {
    if (!token) return;
    api(token, '/api/admin/auctions')
      .then(({ auctions: a }) => setAuctions(a))
      .catch(() => { setToken(''); localStorage.removeItem(STORAGE_KEY); });
  };

  useEffect(loadAuctions, [token]);

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <div className="page page-wide">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Admin</h1>
        <button className="btn-ghost" onClick={() => { setToken(''); localStorage.removeItem(STORAGE_KEY); }}>
          Sign out
        </button>
      </div>

      <div className="admin-tabs">
        {(['auctions', 'users', 'winners', 'referrals'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`admin-tab ${tab === t ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'auctions' && (
        <>
          <section className="dash-section">
            <CreateAuctionForm token={token} onCreated={loadAuctions} />
          </section>
          <section className="dash-section">
            <h2 className="admin-section-title">
              All Auctions
              <button className="btn-ghost" style={{ fontSize: 12, padding: '2px 8px', marginLeft: 8 }} onClick={loadAuctions}>Refresh</button>
            </h2>
            <AuctionList token={token} auctions={auctions} onRefresh={loadAuctions} />
          </section>
        </>
      )}

      {tab === 'users' && (
        <section className="dash-section">
          <UsersPanel token={token} />
        </section>
      )}

      {tab === 'winners' && (
        <section className="dash-section">
          <WinnersPanel token={token} />
        </section>
      )}

      {tab === 'referrals' && (
        <section className="dash-section">
          <ReferralsPanel token={token} />
        </section>
      )}
    </div>
  );
}
