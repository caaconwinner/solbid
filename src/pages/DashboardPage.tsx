import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { DepositAddress } from '../components/DepositAddress';
import { PasswordInput } from '../components/PasswordInput';
import { WinShareModal } from '../components/WinShareModal';
import type { Transaction, Win } from '../types';

type MainTab = 'credits' | 'refer' | 'history' | 'wins' | 'settings';

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── Withdraw modal ─────────────────────────────────────────────
interface WithdrawModalProps {
  maxSol: number;
  onConfirm: (dest: string, credits: number) => void;
  onClose: () => void;
  loading: boolean;
}
function WithdrawModal({ maxSol, onConfirm, onClose, loading }: WithdrawModalProps) {
  const [dest, setDest] = useState('');
  const [sol, setSol]   = useState('');

  const solNum  = parseFloat(sol);
  const credits = sol && !isNaN(solNum) ? Math.floor(solNum / 0.01) : 0;
  const err = sol
    ? isNaN(solNum) || solNum <= 0 ? 'Enter a valid amount'
    : credits < 1                  ? 'Minimum 0.01 SOL (1 credit)'
    : solNum > maxSol              ? `Max ${maxSol.toFixed(4)} SOL`
    : ''
    : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Withdraw SOL</h3>
        <p className="modal-hint">
          On-chain balance: <strong>{maxSol > 0 ? `${maxSol.toFixed(4)} SOL` : maxSol === 0 ? '0 SOL — deposit first' : 'loading…'}</strong>
        </p>
        <div className="form-group">
          <label className="form-label">Destination Solana address</label>
          <input className="form-input" value={dest} onChange={(e) => setDest(e.target.value)}
            placeholder="Paste your wallet address" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">SOL to withdraw</label>
          <div className="sol-input-row">
            <input className="form-input" type="number" min={0.01} max={maxSol} step={0.01}
              value={sol} onChange={(e) => setSol(e.target.value)}
              placeholder={`min 0.01 · max ${maxSol.toFixed(4)}`} />
            <button className="btn-max" onClick={() => setSol(maxSol.toFixed(4))} type="button">MAX</button>
          </div>
          {sol && !err && <p className="form-hint">= {credits} credits deducted</p>}
          {err && <p className="form-error" style={{ marginTop: 4 }}>{err}</p>}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={() => onConfirm(dest.trim(), credits)}
            disabled={loading || !dest.trim() || !!err || credits < 1 || maxSol <= 0}>
            {loading ? 'Sending…' : `Withdraw ${sol || '0'} SOL`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Credits tab ────────────────────────────────────────────────
function CreditsTab({
  user, creditsReady, solBalance, onWithdraw,
}: {
  user: any; creditsReady: boolean; solBalance: number | null; onWithdraw: () => void;
}) {
  const solBacked  = solBalance !== null ? Math.min(user.credits, Math.floor(solBalance / 0.01)) : user.credits;
  const bonusTotal = (user.bonusCredits ?? 0) + Math.max(0, user.credits - solBacked);

  return (
    <div className="dash-tab-content">
      <div className="dash-credits-card">
        <div className="dash-credits-amount">
          <span className="dash-credits-number">{creditsReady ? user.credits + (user.bonusCredits ?? 0) : '—'}</span>
          <span className="dash-credits-label">credits available</span>
        </div>
        {creditsReady && (
          <div className="credits-breakdown-grid">
            {bonusTotal > 0 && (
              <div className="credits-row credits-row--bonus">
                <div className="credits-row-left">
                  <span className="credits-row-count">{bonusTotal}</span>
                  <span className="credits-row-label">bonus credits</span>
                </div>
                <span className="credits-row-note">Used first · bid-only, not withdrawable</span>
              </div>
            )}
            <div className="credits-row credits-row--sol">
              <div className="credits-row-left">
                <span className="credits-row-count credits-row-count--green">{solBacked}</span>
                <span className="credits-row-label">your credits</span>
              </div>
              <span className="credits-row-note">Backed by SOL · withdrawable anytime</span>
            </div>
          </div>
        )}
        <p className="dash-credits-hint">Each bid costs 1 credit (0.01 SOL).</p>
        <div className="dash-sol-balance">
          <span className="dash-sol-label">On-chain balance</span>
          <span className="dash-sol-value">{solBalance === null ? '…' : `${solBalance.toFixed(4)} SOL`}</span>
        </div>
        <button className="btn-withdraw" onClick={onWithdraw}>Withdraw SOL</button>
      </div>

      <div className="dash-deposit-block" id="deposit">
        <h3 className="dash-sub-title">Deposit SOL</h3>
        <DepositAddress address={user.depositAddress} />
      </div>
    </div>
  );
}

// ─── Refer tab ──────────────────────────────────────────────────
function ReferTab({ refCode, token }: { refCode: string; token: string }) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats]   = useState<{ signups: number; creditsEarned: number } | null>(null);
  const link = `${window.location.origin}/register?ref=${refCode}`;

  useEffect(() => { api.referralStats(token).then(setStats).catch(() => {}); }, [token]);

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="dash-tab-content">
      <div className="referral-card">
        <p className="referral-desc">
          Share your link. When someone signs up, deposits <strong>≥ 0.05 SOL</strong>, and places at least one bid, you get{' '}
          <span style={{ color: 'var(--orange)', fontWeight: 700 }}>+10 bonus credits</span>.
        </p>
        <div className="referral-row">
          <input className="referral-input" readOnly value={link}
            onClick={e => (e.target as HTMLInputElement).select()} />
          <button className="referral-copy-btn" onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {stats !== null && (
          <div className="referral-stats">
            <div className="referral-stat">
              <span className="referral-stat-val">{stats.signups}</span>
              <span className="referral-stat-label">signed up</span>
            </div>
            <div className="referral-stat-divider" />
            <div className="referral-stat">
              <span className="referral-stat-val" style={{ color: 'var(--orange)' }}>{stats.creditsEarned}</span>
              <span className="referral-stat-label">credits earned</span>
            </div>
          </div>
        )}
      </div>
      <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        <Link to="/refer" style={{ color: 'var(--orange)' }}>Learn more about the referral program →</Link>
      </p>
    </div>
  );
}

// ─── History tab ────────────────────────────────────────────────
function TxTable({ rows }: { rows: Transaction[] }) {
  if (rows.length === 0) return <p className="dash-empty">Nothing here yet.</p>;
  return (
    <div className="tx-table-wrap">
      <table className="tx-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
            <th>Detail</th>
            <th className="tx-credits">Credits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => (
            <tr key={tx.id}>
              <td className="tx-time">{fmtDate(tx.ts)}</td>
              <td><span className={`tx-badge tx-badge--${tx.type}`}>{tx.type}</span></td>
              <td className="tx-detail">
                {tx.type === 'bid' && (
                  tx.auctionId
                    ? <Link to={`/auction/${tx.auctionId}`}>{tx.item}</Link>
                    : tx.item
                )}
                {(tx.type === 'withdraw' || tx.type === 'deposit') && (
                  <>
                    {tx.sol?.toFixed(4)} SOL{' '}
                    {tx.sig && (
                      <a href={`https://solscan.io/tx/${tx.sig}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        solscan ↗
                      </a>
                    )}
                  </>
                )}
              </td>
              <td className={`tx-credits ${tx.credits < 0 ? 'tx-neg' : 'tx-pos'}`}>
                {tx.credits > 0 ? `+${tx.credits}` : tx.credits}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTab({ txs }: { txs: Transaction[] }) {
  const [filter, setFilter] = useState<'deposits' | 'bids'>('deposits');
  const deposits = txs.filter(t => t.type === 'deposit' || t.type === 'withdraw');
  const bids     = txs.filter(t => t.type === 'bid');

  return (
    <div className="dash-tab-content">
      <div className="dash-history-filters">
        <button
          className={`dash-filter-btn ${filter === 'deposits' ? 'dash-filter-btn--active' : ''}`}
          onClick={() => setFilter('deposits')}
        >
          Deposits & Withdrawals
          {deposits.length > 0 && <span className="tx-tab-count">{deposits.length}</span>}
        </button>
        <button
          className={`dash-filter-btn ${filter === 'bids' ? 'dash-filter-btn--active' : ''}`}
          onClick={() => setFilter('bids')}
        >
          Bid History
          {bids.length > 0 && <span className="tx-tab-count">{bids.length}</span>}
        </button>
      </div>
      <TxTable rows={filter === 'deposits' ? deposits : bids} />
    </div>
  );
}

// ─── Wins tab ───────────────────────────────────────────────────
function WinsTab({ token }: { token: string }) {
  const [wins,       setWins]       = useState<Win[]>([]);
  const [paying,     setPaying]     = useState<string | null>(null);
  const [shareWin,   setShareWin]   = useState<Win | null>(null);

  const reload = () => api.myWins(token).then(({ wins: w }) => setWins(w));
  useEffect(() => { reload(); }, [token]);

  const cluster = import.meta.env.VITE_SOLANA_CLUSTER ?? 'mainnet-beta';
  const suffix  = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;

  const purchase = async (win: Win) => {
    setPaying(win.id);
    try {
      const result = await api.purchaseWin(token, win.id);
      toast.success(
        <span>
          Payment confirmed!{' '}
          {result.sig && (
            <a href={`https://solscan.io/tx/${result.sig}${suffix}`} target="_blank" rel="noreferrer"
              style={{ color: 'var(--green)' }}>View on Solscan</a>
          )}
        </span>,
        { duration: 10000 },
      );
      reload();
    } catch (e: any) {
      toast.error(e.message ?? 'Payment failed');
    } finally { setPaying(null); }
  };

  if (wins.length === 0) return (
    <div className="dash-tab-content">
      <p className="dash-empty">No wins yet — go bid!</p>
    </div>
  );

  return (
    <div className="dash-tab-content">
      {shareWin && <WinShareModal win={shareWin} onClose={() => setShareWin(null)} />}
      <div className="wins-list">
        {wins.map((win) => (
          <div key={win.id} className={`win-card ${win.purchased ? 'win-card--claimed' : 'win-card--pending'}`}
            onClick={() => setShareWin(win)} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShareWin(win)}
            style={{ cursor: 'pointer' }}
          >
            <div className="win-card-header">
              <span className="win-card-name">{win.itemName}</span>
              <span className="win-card-price">Auction ended at ${win.finalPrice.toFixed(2)}</span>
              {win.purchased || win.purchaseSig?.startsWith('admin-')
                ? <span className="win-badge">Claimed</span>
                : <span className="win-badge win-badge--pending">Awaiting payment</span>}
            </div>
            {(() => {
              const adminSent = win.purchaseSig?.startsWith('admin-');
              if (!win.purchased && !adminSent) {
                return (
                  <div className="win-prize">
                    <p className="win-purchase-info">
                      {win.prize.type === 'sol'
                        ? <>You won a <strong style={{ color: 'var(--green)' }}>{win.prize.amount} SOL</strong> prize! Pay the auction price to claim it.</>
                        : win.prize.type === 'credits'
                        ? <>You won <strong style={{ color: 'var(--orange)' }}>{win.prize.amount} bonus credits</strong>! Pay the auction price and they'll be added to your account instantly.</>
                        : win.prize.type === 'token'
                        ? <>You won <strong style={{ color: 'var(--orange)' }}>{win.prize.amount} tokens</strong>! Pay the auction price and the tokens will be sent to your deposit wallet.</>
                        : <>You won the right to buy this item.</>
                      }{' '}
                      The payment of{' '}
                      <strong>{win.purchasePrice < 0.0001 ? win.purchasePrice.toFixed(6) : win.purchasePrice.toFixed(4)} SOL</strong>{' '}
                      will be drawn from your deposit wallet.
                    </p>
                    <button className="btn-outline" disabled={paying === win.id} onClick={(e) => { e.stopPropagation(); purchase(win); }}>
                      {paying === win.id ? 'Processing…' : `Pay ${win.purchasePrice < 0.0001 ? win.purchasePrice.toFixed(6) : win.purchasePrice.toFixed(4)} SOL & claim`}
                    </button>
                  </div>
                );
              }
              return (
                <div className="win-prize">
                  {win.prize.type === 'digital' && (
                    <><p className="win-prize-label">Gift card / download code</p><p className="win-code">{win.prize.code}</p></>
                  )}
                  {win.prize.type === 'physical' && (
                    <><p className="win-prize-label">Physical item</p><p className="win-prize-desc">{win.prize.description}</p></>
                  )}
                  {win.prize.type === 'sol' && (
                    <><p className="win-prize-label">SOL prize</p>
                    <p className="win-prize-desc" style={{ color: 'var(--green)' }}>{win.prize.amount} SOL sent to your deposit wallet ✓</p></>
                  )}
                  {win.prize.type === 'credits' && (
                    <><p className="win-prize-label">Credits prize</p>
                    <p className="win-prize-desc" style={{ color: 'var(--orange)' }}>+{win.prize.amount} bonus credits added to your account ✓</p></>
                  )}
                  {win.prize.type === 'token' && (
                    <><p className="win-prize-label">Token prize</p>
                    <p className="win-prize-desc" style={{ color: 'var(--orange)' }}>{win.prize.amount} tokens sent to your deposit wallet ✓</p></>
                  )}
                  {win.purchaseSig && !adminSent && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Payment tx:{' '}
                      <a href={`https://solscan.io/tx/${win.purchaseSig}${suffix}`} target="_blank" rel="noreferrer">
                        {win.purchaseSig.slice(0, 16)}…
                      </a>
                    </p>
                  )}
                </div>
              );
            })()}
            <p className="win-card-date">{fmtDate(win.ts)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings tab ───────────────────────────────────────────────
function SettingsTab({ token, user }: { token: string; user: any }) {
  const [email,  setEmail]  = useState(user.email ?? '');
  const [curPw,  setCurPw]  = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [saving, setSaving] = useState(false);

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.updateEmail(token, email); toast.success('Email updated'); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const savePw = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.changePassword(token, curPw, newPw); toast.success('Password changed'); setCurPw(''); setNewPw(''); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="dash-tab-content">
      <div className="dash-settings-block">
        <h3 className="dash-sub-title">Email address</h3>
        <form onSubmit={saveEmail} className="settings-email-form">
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <input className="form-input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <button className="btn-outline" type="submit" disabled={saving}>Save</button>
        </form>
      </div>

      <div className="dash-settings-block">
        <h3 className="dash-sub-title">Change password</h3>
        <form onSubmit={savePw} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PasswordInput value={curPw} onChange={setCurPw} placeholder="Current password"
            autoComplete="current-password" required />
          <PasswordInput value={newPw} onChange={setNewPw} placeholder="New password (min 8 chars)"
            autoComplete="new-password" minLength={8} required />
          <button className="btn-outline" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            Change password
          </button>
        </form>
      </div>

      <div className="dash-settings-block">
        <h3 className="dash-sub-title">How it works</h3>
        <ol className="how-it-works">
          <li>Send SOL to your deposit address (Credits tab).</li>
          <li>Credits appear within ~15 seconds.</li>
          <li>Each bid costs <strong>0.01 SOL</strong> (1 credit) and raises the price by <strong>$0.01 USD</strong>.</li>
          <li>When ≤15 seconds remain, each bid resets the timer to 15s. Last bidder wins the <strong>right to purchase</strong> the item at the final price in SOL.</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────
export function DashboardPage() {
  const { user, token, refreshCredits, creditsReady } = useAuth();
  const [searchParams] = useSearchParams();
  const [txs, setTxs]                 = useState<Transaction[]>([]);
  const [solBalance, setSolBalance]   = useState<number | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const initialTab = (['credits','refer','history','wins','settings'].includes(searchParams.get('tab') ?? '')
    ? searchParams.get('tab') as MainTab : 'credits');
  const [tab, setTab] = useState<MainTab>(initialTab);

  const loadTxs = (t: string) =>
    api.transactions(t).then(({ transactions }) => setTxs(transactions));

  useEffect(() => {
    if (!token) return;
    refreshCredits();
    loadTxs(token);
    api.balance(token).then(({ sol }) => setSolBalance(sol));
    const id = setInterval(() => {
      api.balance(token).then(({ sol }) => setSolBalance(sol));
      loadTxs(token);
    }, 15_000);
    return () => clearInterval(id);
  }, [token]);

  const handleWithdraw = async (dest: string, amount: number) => {
    if (!token || !user) return;
    setWithdrawing(true);
    try {
      const { solAmount, sig } = await api.withdraw(token, amount, dest);
      const cluster = import.meta.env.VITE_SOLANA_CLUSTER ?? 'mainnet-beta';
      const suffix  = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
      toast.success(
        <span>
          Sent {solAmount} SOL —{' '}
          <a href={`https://solscan.io/tx/${sig}${suffix}`} target="_blank" rel="noreferrer"
            style={{ color: 'var(--green)' }}>View on Solscan</a>
        </span>,
        { duration: 10000 },
      );
      setShowWithdraw(false);
      await refreshCredits();
      if (token) { loadTxs(token); api.balance(token).then(({ sol }) => setSolBalance(sol)); }
    } catch (e: any) {
      toast.error(e.message ?? 'Withdraw failed');
    } finally { setWithdrawing(false); }
  };

  if (!user) return null;

  const TABS: { id: MainTab; label: string }[] = [
    { id: 'credits',  label: 'Credits'  },
    { id: 'refer',    label: 'Refer'    },
    { id: 'history',  label: 'History'  },
    { id: 'wins',     label: 'Wins'     },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="page page-narrow">
      <h1 className="page-title">Account</h1>

      <div className="dash-main-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`dash-main-tab ${tab === t.id ? 'dash-main-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'credits' && (
        <CreditsTab
          user={user}
          creditsReady={creditsReady}
          solBalance={solBalance}
          onWithdraw={() => setShowWithdraw(true)}
        />
      )}
      {tab === 'refer' && user.refCode && token && (
        <ReferTab refCode={user.refCode} token={token} />
      )}
      {tab === 'refer' && !user.refCode && (
        <div className="dash-tab-content"><p className="dash-empty">No referral code available.</p></div>
      )}
      {tab === 'history' && <HistoryTab txs={txs} />}
      {tab === 'wins'    && token && <WinsTab token={token} />}
      {tab === 'settings' && token && <SettingsTab token={token} user={user} />}

      {showWithdraw && (
        <WithdrawModal
          maxSol={solBalance ?? 0}
          onConfirm={handleWithdraw}
          onClose={() => setShowWithdraw(false)}
          loading={withdrawing}
        />
      )}
    </div>
  );
}
