import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { DepositAddress } from '../components/DepositAddress';
import { PasswordInput } from '../components/PasswordInput';
import type { Transaction, Win } from '../types';

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── Withdraw modal ──────────────────���─────────────────────────
interface WithdrawModalProps {
  maxSol: number;
  onConfirm: (dest: string, credits: number) => void;
  onClose: () => void;
  loading: boolean;
}
function WithdrawModal({ maxSol, onConfirm, onClose, loading }: WithdrawModalProps) {
  const [dest, setDest]   = useState('');
  const [sol, setSol]     = useState('');

  const solNum     = parseFloat(sol);
  const FEE_SOL    = 0.000010;
  const maxSolNet4 = Math.max(0, Math.floor((maxSol - FEE_SOL) / 0.01) * 0.01);
  const credits   = sol && !isNaN(solNum) ? Math.floor(solNum / 0.01) : 0;
  const err = sol
    ? isNaN(solNum) || solNum <= 0 ? 'Enter a valid amount'
    : credits < 1                  ? 'Minimum 0.01 SOL (1 credit)'
    : solNum > maxSolNet4          ? `Max ${maxSolNet4.toFixed(4)} SOL`
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
          <input
            className="form-input"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="Paste your wallet address"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">SOL to withdraw</label>
          <div className="sol-input-row">
            <input
              className="form-input"
              type="number"
              min={0.01}
              max={maxSolNet4}
              step={0.01}
              value={sol}
              onChange={(e) => setSol(e.target.value)}
              placeholder={`min 0.01 · max ${maxSolNet4.toFixed(4)}`}
            />
            <button className="btn-max" onClick={() => setSol(maxSolNet4.toFixed(4))} type="button">
              MAX
            </button>
          </div>
          {sol && !err && <p className="form-hint">= {credits} credits deducted</p>}
          {err && <p className="form-error" style={{ marginTop: 4 }}>{err}</p>}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(dest.trim(), credits)}
            disabled={loading || !dest.trim() || !!err || credits < 1 || maxSolNet4 <= 0}
          >
            {loading ? 'Sending…' : `Withdraw ${sol || '0'} SOL`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tx table ──────────────────────────────────────────────────
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
                {tx.type === 'bid'      && (
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

// ─── Won Auctions ───────────────────────────────────────────────
function WonAuctions({ token }: { token: string }) {
  const [wins,      setWins]      = useState<Win[]>([]);
  const [paying,    setPaying]    = useState<string | null>(null);

  const reload = () => api.myWins(token).then(({ wins: w }) => setWins(w));
  useEffect(() => { reload(); }, [token]);

  const purchase = async (win: Win) => {
    setPaying(win.id);
    try {
      const result = await api.purchaseWin(token, win.id);
      const cluster = import.meta.env.VITE_SOLANA_CLUSTER ?? 'devnet';
      const suffix  = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
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
    } finally {
      setPaying(null);
    }
  };

  if (wins.length === 0) return <p className="dash-empty">No wins yet — go bid!</p>;

  return (
    <div className="wins-list">
      {wins.map((win) => (
        <div key={win.id} className={`win-card ${win.purchased ? 'win-card--claimed' : 'win-card--pending'}`}>
          <div className="win-card-header">
            <span className="win-card-name">{win.itemName}</span>
            <span className="win-card-price">Auction ended at ${win.finalPrice.toFixed(2)}</span>
            {win.purchased
              ? <span className="win-badge">Purchased</span>
              : <span className="win-badge win-badge--pending">Awaiting payment</span>}
          </div>

          {!win.purchased ? (
            <div className="win-prize">
              <p className="win-purchase-info">
                You won the right to buy this item for{' '}
                <strong>{win.purchasePrice.toFixed(4)} SOL</strong>.
                The payment will be drawn from your deposit wallet.
              </p>
              <button
                className="btn-primary"
                disabled={paying === win.id}
                onClick={() => purchase(win)}
              >
                {paying === win.id ? 'Processing…' : `Pay ${win.purchasePrice.toFixed(4)} SOL & claim item`}
              </button>
            </div>
          ) : (
            <div className="win-prize">
              {win.prize.type === 'digital' && (
                <>
                  <p className="win-prize-label">Gift card / download code</p>
                  <p className="win-code">{win.prize.code}</p>
                </>
              )}
              {win.prize.type === 'physical' && (
                <>
                  <p className="win-prize-label">Physical item</p>
                  <p className="win-prize-desc">{win.prize.description}</p>
                </>
              )}
              {win.prize.type === 'sol' && (
                <>
                  <p className="win-prize-label">SOL prize</p>
                  <p className="win-prize-desc" style={{ color: 'var(--green)' }}>
                    {win.prize.amount} SOL prize — contact support to arrange transfer.
                  </p>
                </>
              )}
              {win.purchaseSig && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Payment tx:{' '}
                  <a href={`https://solscan.io/tx/${win.purchaseSig}`} target="_blank" rel="noreferrer">
                    {win.purchaseSig.slice(0, 16)}…
                  </a>
                </p>
              )}
            </div>
          )}

          <p className="win-card-date">{fmtDate(win.ts)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Account Settings ───────────────────────────────────────────
function AccountSettings({ token, user }: { token: string; user: any }) {
  const [email,    setEmail]    = useState(user.email ?? '');
  const [curPw,    setCurPw]    = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateEmail(token, email);
      toast.success('Email updated');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const savePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.changePassword(token, curPw, newPw);
      toast.success('Password changed');
      setCurPw(''); setNewPw('');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <form onSubmit={saveEmail} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Email address</label>
          <input className="form-input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <button className="btn-primary" type="submit" disabled={saving}>Save</button>
      </form>

      <form onSubmit={savePw} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label className="form-label">Change password</label>
        <PasswordInput value={curPw} onChange={setCurPw} placeholder="Current password"
          autoComplete="current-password" required />
        <PasswordInput value={newPw} onChange={setNewPw} placeholder="New password (min 8 chars)"
          autoComplete="new-password" minLength={8} required />
        <button className="btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          Change password
        </button>
      </form>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────
export function DashboardPage() {
  const { user, token, refreshCredits } = useAuth();
  const [txs, setTxs]               = useState<Transaction[]>([]);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [tab, setTab] = useState<'bids' | 'funds' | 'wins'>('funds');

  const loadTxs = (t: string) =>
    api.transactions(t).then(({ transactions }) => setTxs(transactions));

  useEffect(() => {
    if (!token) return;
    refreshCredits();
    loadTxs(token);
    api.balance(token).then(({ sol }) => setSolBalance(sol));
    // Refresh balance every 15s to match server polling interval
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
      const cluster = import.meta.env.VITE_SOLANA_CLUSTER ?? 'devnet';
      const suffix  = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
      toast.success(
        <span>
          Sent {solAmount} SOL —{' '}
          <a href={`https://solscan.io/tx/${sig}${suffix}`} target="_blank" rel="noreferrer"
             style={{ color: 'var(--green)' }}>
            View on Solscan
          </a>
        </span>,
        { duration: 10000 },
      );
      setShowWithdraw(false);
      await refreshCredits();
      if (token) {
        loadTxs(token);
        api.balance(token).then(({ sol }) => setSolBalance(sol));
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Withdraw failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (!user) return null;

  const bids  = txs.filter((t) => t.type === 'bid');
  const funds = txs.filter((t) => t.type !== 'bid');

  return (
    <div className="page page-narrow">
      <h1 className="page-title">Account</h1>

      {/* Credits card */}
      <section className="dash-section">
        <h2 className="dash-section-title">Bid Credits</h2>
        <div className="dash-credits-card">
          <div className="dash-credits-amount">
            <span className="dash-credits-number">{user.credits + (user.bonusCredits ?? 0)}</span>
            <span className="dash-credits-label">credits available</span>
          </div>
          {(user.bonusCredits ?? 0) > 0 && (
            <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 13 }}>
              <span style={{ color: 'var(--text)' }}>
                <strong>{user.credits}</strong> <span style={{ color: 'var(--muted)' }}>SOL-backed (withdrawable)</span>
              </span>
              <span style={{ color: 'var(--text)' }}>
                <strong>{user.bonusCredits}</strong> <span style={{ color: 'var(--orange)' }}>bonus (bid only)</span>
              </span>
            </div>
          )}
          <p className="dash-credits-hint">Each bid costs 1 credit (0.01 SOL).</p>
          <div className="dash-sol-balance">
            <span className="dash-sol-label">On-chain balance</span>
            <span className="dash-sol-value">
              {solBalance === null ? '…' : `${solBalance.toFixed(4)} SOL`}
            </span>
          </div>
          <button
            className="btn-withdraw"
            onClick={() => setShowWithdraw(true)}
          >
            Withdraw SOL
          </button>
        </div>
      </section>

      {/* Deposit */}
      <section className="dash-section">
        <h2 className="dash-section-title">Deposit SOL</h2>
        <DepositAddress address={user.depositAddress} />
      </section>

      {/* Tabbed history */}
      <section className="dash-section">
        <div className="tx-tabs">
          <button className={`tx-tab ${tab === 'funds' ? 'tx-tab--active' : ''}`} onClick={() => setTab('funds')}>
            Deposits & Withdrawals
            {funds.length > 0 && <span className="tx-tab-count">{funds.length}</span>}
          </button>
          <button className={`tx-tab ${tab === 'bids' ? 'tx-tab--active' : ''}`} onClick={() => setTab('bids')}>
            Bid History
            {bids.length > 0 && <span className="tx-tab-count">{bids.length}</span>}
          </button>
          <button className={`tx-tab ${tab === 'wins' ? 'tx-tab--active' : ''}`} onClick={() => setTab('wins')}>
            Won Auctions
          </button>
        </div>
        {tab === 'funds' && <TxTable rows={funds} />}
        {tab === 'bids'  && <TxTable rows={bids} />}
        {tab === 'wins'  && token && <WonAuctions token={token} />}
      </section>

      {/* Account settings */}
      <section className="dash-section">
        <h2 className="dash-section-title">Account Settings</h2>
        <AccountSettings token={token!} user={user} />
      </section>

      {/* How it works */}
      <section className="dash-section">
        <h2 className="dash-section-title">How it works</h2>
        <ol className="how-it-works">
          <li>Send SOL to your deposit address above.</li>
          <li>Credits appear within ~15 seconds.</li>
          <li>Each bid costs <strong>0.01 SOL</strong> (1 credit) and raises the price by <strong>$0.01 USD</strong>.</li>
          <li>When ≤15 seconds remain, each bid resets the timer to 15s. Last bidder wins the <strong>right to purchase</strong> the item at the final price in SOL.</li>
        </ol>
      </section>

      <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>
        Browse Auctions →
      </Link>

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
