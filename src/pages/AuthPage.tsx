import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';
import { api } from '../api';
import { useTimer } from '../hooks/useTimer';
import type { AuctionListing } from '../types';

// ── Tab type ─────────────────────────────────────────────────────
type Tab = 'login' | 'hiw' | 'auctions';

// ── Login form ───────────────────────────────────────────────────
function LoginTab() {
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
    <div className="auth-tab-content">
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
  );
}

// ── How It Works (condensed inline version) ───────────────────────
function HowItWorksTab() {
  return (
    <div className="auth-hiw">
      <p className="auth-hiw-intro">
        penny<strong>Bid</strong> is a Solana penny auction — win high-value items for a fraction of retail.
      </p>

      <div className="auth-hiw-steps">
        {[
          {
            n: 1,
            title: 'Deposit SOL, get bid credits',
            body: '1 credit = 0.01 SOL. Credits are non-refundable once bid. Unspent credits can always be withdrawn.',
          },
          {
            n: 2,
            title: 'Pick an auction & start bidding',
            body: 'Every bid raises the price by $0.01 and costs 1 credit. The auction starts at $0.01.',
          },
          {
            n: 3,
            title: 'Snap timer — bid resets the clock',
            body: 'When ≤15 seconds remain, each bid resets the timer to 15s. Be the last bidder when it hits zero.',
          },
          {
            n: 4,
            title: 'Last bidder wins the right to purchase',
            body: 'The winner pays the final price in SOL to claim the item — often 90–99% off retail value.',
          },
          {
            n: 5,
            title: 'Cashback raffle for everyone',
            body: 'At auction end, one random bidder wins back their bid count as bonus credits. You\'re entered automatically.',
          },
        ].map(({ n, title, body }) => (
          <div key={n} className="auth-hiw-step">
            <div className="auth-hiw-step-num">{n}</div>
            <div>
              <div className="auth-hiw-step-title">{title}</div>
              <div className="auth-hiw-step-body">{body}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="auth-hiw-faq">
        <div className="auth-hiw-faq-item">
          <strong>Are credits refundable?</strong>
          <span> Credits used to bid are not. Unspent credits are always fully withdrawable as SOL.</span>
        </div>
        <div className="auth-hiw-faq-item">
          <strong>Is my SOL safe?</strong>
          <span> Your deposit wallet is custodial, encrypted AES-256-GCM. Only withdrawal operations sign transactions.</span>
        </div>
        <div className="auth-hiw-faq-item">
          <strong>New users get 5 free credits</strong>
          <span> to try the platform — no deposit required to place your first bids.</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/register" className="btn-primary" style={{ display: 'inline-block' }}>
          Create account &amp; start bidding
        </Link>
      </div>
    </div>
  );
}

// ── Public auction mini-card ──────────────────────────────────────
function PublicAuctionTimer({ endsAtMs, status }: { endsAtMs: number; status: string }) {
  const ms      = useTimer(status === 'active' ? endsAtMs : null, 0);
  const seconds = ms / 1000;

  if (status === 'scheduled') return <span className="card-status scheduled">UPCOMING</span>;
  if (status === 'ended' || status === 'settled') return <span className="card-status ended">ENDED</span>;

  const urgent = seconds <= 15;
  return (
    <span className="card-timer" data-urgent={urgent}>
      {seconds >= 60
        ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
        : `${seconds.toFixed(1)}s`}
    </span>
  );
}

function PublicAuctionCard({ auction }: { auction: AuctionListing }) {
  const ended = auction.status === 'ended' || auction.status === 'settled';
  return (
    <div className="pub-auction-card">
      <div className="pub-auction-img-wrap">
        <img className="pub-auction-img" src={auction.item.image} alt={auction.item.name} />
        {ended && <div className="ended-overlay">ENDED</div>}
      </div>
      <div className="pub-auction-body">
        <div className="pub-auction-name">{auction.item.name}</div>
        <div className="pub-auction-row">
          <span className="pub-auction-price">${auction.currentPrice.toFixed(2)}</span>
          <PublicAuctionTimer endsAtMs={auction.endsAtMs} status={auction.status} />
        </div>
        <div className="pub-auction-meta">
          {auction.totalBids} bids
          {auction.leaderName && !ended && (
            <span> · leader: <strong>{auction.leaderName}</strong></span>
          )}
          {auction.leaderName && ended && (
            <span> · won by <strong>{auction.leaderName}</strong></span>
          )}
        </div>
        <div className="pub-auction-retail">
          Retail: <strong>${auction.item.retailValue.toLocaleString()}</strong>
        </div>
      </div>
    </div>
  );
}

function AuctionsTab() {
  const [auctions, setAuctions] = useState<AuctionListing[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const hasDataRef              = useRef(false);

  useEffect(() => {
    const fetchAuctions = () =>
      api.auctionsPublic()
        .then(({ auctions: a }) => {
          setAuctions(a);
          setError('');
          setLoading(false);
          hasDataRef.current = true;
        })
        .catch((err) => {
          if (!hasDataRef.current) {
            setError(err.message ?? 'Failed to load auctions');
            setLoading(false);
          }
        });

    fetchAuctions();
    const id = setInterval(fetchAuctions, 5000);
    return () => clearInterval(id);
  }, []);

  const live     = auctions.filter(a => a.status === 'active').sort((a, b) => b.endsAtMs - a.endsAtMs);
  const upcoming = auctions.filter(a => a.status === 'scheduled').sort((a, b) => a.endsAtMs - b.endsAtMs);
  const past     = auctions.filter(a => a.status === 'ended' || a.status === 'settled').sort((a, b) => b.endsAtMs - a.endsAtMs);

  if (loading) {
    return (
      <div className="auth-auctions-loading">
        <div className="spinner" />
        <p>Loading auctions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-auctions-empty">
        <p style={{ color: 'var(--red)' }}>{error}</p>
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="auth-auctions-empty">
        <p>No auctions right now. Check back soon.</p>
        <Link to="/register" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
          Create account to get notified
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-auctions">
      <div className="auth-auctions-cta">
        <Link to="/login" className="btn-primary" style={{ fontSize: 13, padding: '7px 18px' }}>Sign in to bid</Link>
        <Link to="/register" className="btn-outline" style={{ fontSize: 13, padding: '7px 18px' }}>Create account</Link>
      </div>

      {live.length > 0 && (
        <div className="auth-auctions-section">
          <div className="auth-auctions-section-title">
            <span className="live-dot" /> Live Now
          </div>
          <div className="auth-auctions-grid">
            {live.map(a => <PublicAuctionCard key={a.auctionId} auction={a} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="auth-auctions-section">
          <div className="auth-auctions-section-title">Upcoming</div>
          <div className="auth-auctions-grid">
            {upcoming.map(a => <PublicAuctionCard key={a.auctionId} auction={a} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="auth-auctions-section">
          <div className="auth-auctions-section-title">Recently Ended</div>
          <div className="auth-auctions-grid">
            {past.map(a => <PublicAuctionCard key={a.auctionId} auction={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────
export function AuthPage({ defaultTab = 'login' }: { defaultTab?: Tab }) {
  const location = useLocation();
  // Allow tab override via URL hash: #hiw, #auctions
  const hashTab = location.hash.replace('#', '') as Tab;
  const [tab, setTab] = useState<Tab>(
    (['login', 'hiw', 'auctions'] as Tab[]).includes(hashTab) ? hashTab : defaultTab
  );

  return (
    <div className="auth-page auth-page--wide">
      <div className="auth-card auth-card--tabbed">
        <div className="auth-logo">penny<strong>Bid</strong></div>

        <div className="auth-tabs">
          <button
            className="auth-tab-btn"
            data-active={tab === 'login'}
            onClick={() => setTab('login')}
          >
            Sign in
          </button>
          <button
            className="auth-tab-btn"
            data-active={tab === 'hiw'}
            onClick={() => setTab('hiw')}
          >
            How it works
          </button>
          <button
            className="auth-tab-btn"
            data-active={tab === 'auctions'}
            onClick={() => setTab('auctions')}
          >
            Auctions
          </button>
        </div>

        {tab === 'login'    && <LoginTab />}
        {tab === 'hiw'      && <HowItWorksTab />}
        {tab === 'auctions' && <AuctionsTab />}
      </div>
    </div>
  );
}
