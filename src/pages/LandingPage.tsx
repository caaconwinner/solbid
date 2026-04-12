import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../hooks/useTimer';
import { api } from '../api';
import type { AuctionListing } from '../types';

// ── Types ─────────────────────────────────────────────────────────
interface RecentWin {
  itemName:    string;
  itemImage:   string | null;
  finalPrice:  number;
  username:    string;
  retailValue: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────
function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  if (m > 0)  return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

function savings(finalPrice: number, retailValue: number) {
  return Math.round((1 - finalPrice / retailValue) * 100);
}

// ── Featured auction timer ────────────────────────────────────────
function LiveTimer({ auction }: { auction: AuctionListing }) {
  const ms      = useTimer(auction.status === 'active' ? auction.endsAtMs : null, 0);
  const startMs = useTimer(auction.status === 'scheduled' && auction.startsAtMs ? auction.startsAtMs : null, 0);
  const secs    = ms / 1000;

  if (auction.status === 'scheduled') {
    return <span className="lp-feat-timer lp-feat-timer--soon">starts in {countdown(startMs)}</span>;
  }
  if (auction.status === 'ended' || auction.status === 'settled') {
    return <span className="lp-feat-timer lp-feat-timer--ended">ENDED</span>;
  }
  const urgent = secs <= 15;
  return (
    <span className="lp-feat-timer" data-urgent={urgent}>
      {secs >= 60
        ? `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
        : `${secs.toFixed(1)}s`}
    </span>
  );
}

// ── Featured auction card (real data) ────────────────────────────
function FeaturedCard({ auction }: { auction: AuctionListing }) {
  const isLive = auction.status === 'active';
  return (
    <Link to={`/auction/${auction.auctionId}`} className="lp-feat-card" style={{ textDecoration: 'none' }}>
      <div className="lp-feat-img-wrap">
        <img src={auction.item.image} alt={auction.item.name} className="lp-feat-img" />
        {isLive && <span className="lp-feat-live-badge"><span className="live-dot" /> LIVE</span>}
      </div>
      <div className="lp-feat-body">
        <div className="lp-feat-name">{auction.item.name}</div>
        <div className="lp-feat-retail">Retail: <s>${auction.item.retailValue.toLocaleString()}</s></div>
        <div className="lp-feat-row">
          <div>
            <div className="lp-feat-price-label">Current price</div>
            <div className="lp-feat-price">${auction.currentPrice.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="lp-feat-price-label">Time left</div>
            <LiveTimer auction={auction} />
          </div>
        </div>
        <div className="lp-feat-meta">{auction.totalBids} bids placed{auction.leaderName ? ` · leader: ${auction.leaderName}` : ''}</div>
        <div className="lp-feat-cta">Place Bid — 1 credit</div>
      </div>
    </Link>
  );
}

// ── Mock card (no live auctions) ──────────────────────────────────
function MockFeaturedCard() {
  return (
    <div className="lp-feat-card lp-feat-card--mock">
      <div className="lp-feat-img-wrap lp-feat-img-wrap--mock">
        <span style={{ fontSize: 64 }}>🎮</span>
        <span className="lp-feat-live-badge lp-feat-live-badge--soon">COMING SOON</span>
      </div>
      <div className="lp-feat-body">
        <div className="lp-feat-name">PS5 Console</div>
        <div className="lp-feat-retail">Retail: <s>$499</s></div>
        <div className="lp-feat-row">
          <div>
            <div className="lp-feat-price-label">Starting price</div>
            <div className="lp-feat-price">$0.01</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="lp-feat-price-label">Status</div>
            <span className="lp-feat-timer lp-feat-timer--soon">Upcoming</span>
          </div>
        </div>
        <div className="lp-feat-meta">Be the first to bid</div>
        <Link to="/register" className="lp-feat-cta lp-feat-cta--link">Create account to get notified</Link>
      </div>
    </div>
  );
}

// ── Recent win card ───────────────────────────────────────────────
function WinCard({ win, example }: { win: RecentWin; example?: boolean }) {
  const pct = win.retailValue ? savings(win.finalPrice, win.retailValue) : null;
  return (
    <div className="lp-win-card">
      {example && <div className="lp-win-example">example</div>}
      <div className="lp-win-item">{win.itemName}</div>
      <div className="lp-win-price">${win.finalPrice.toFixed(2)}</div>
      {win.retailValue && <div className="lp-win-retail"><s>${win.retailValue.toLocaleString()}</s></div>}
      {pct !== null && pct > 0 && <div className="lp-win-badge">saved {pct}%</div>}
      <div className="lp-win-user">won by <strong>{win.username}</strong></div>
    </div>
  );
}

const EXAMPLE_WINS: RecentWin[] = [
  { itemName: 'PS5 Console',       finalPrice: 1.43, username: 'shadow99', retailValue: 499,  itemImage: null },
  { itemName: 'iPhone 16 Pro',     finalPrice: 0.87, username: 'xLancer',  retailValue: 999,  itemImage: null },
  { itemName: 'Apple Watch S10',   finalPrice: 0.54, username: 'cryptobid', retailValue: 399, itemImage: null },
  { itemName: 'AirPods Pro',       finalPrice: 0.31, username: 'moon_sol', retailValue: 249,  itemImage: null },
];

// ── Main page ─────────────────────────────────────────────────────
export function LandingPage() {
  const { user } = useAuth();
  const [auctions,    setAuctions]    = useState<AuctionListing[]>([]);
  const [recentWins,  setRecentWins]  = useState<RecentWin[]>([]);
  const [winsLoaded,  setWinsLoaded]  = useState(false);

  useEffect(() => {
    api.auctionsPublic().then(({ auctions: a }) => setAuctions(a)).catch(() => {});
    api.recentWins().then(({ wins }) => { setRecentWins(wins); setWinsLoaded(true); }).catch(() => setWinsLoaded(true));

    const id = setInterval(() => {
      api.auctionsPublic().then(({ auctions: a }) => setAuctions(a)).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // Pick best auction to feature: prefer active, then scheduled
  const featured = auctions.find(a => a.status === 'active') ?? auctions.find(a => a.status === 'scheduled') ?? null;

  const showExampleWins = winsLoaded && recentWins.length === 0;
  const winsToShow      = showExampleWins ? EXAMPLE_WINS : recentWins.slice(0, 4);

  const primaryCta = user
    ? <Link to="/auctions" className="btn-primary lp-cta-btn">View auctions</Link>
    : <Link to="/register" className="btn-primary lp-cta-btn">Create account</Link>;

  return (
    <div className="lp-page">

      {/* ── Section 1: Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <h1 className="lp-hero-headline">Win real items for<br />pennies on the dollar</h1>
          <p className="lp-hero-sub">
            Penny auctions on Solana. Every bid costs $0.01. Last bidder wins.<br className="lp-br-desktop" />
            Items sell for 90–99% below retail.
          </p>
          <div className="lp-hero-ctas">
            {primaryCta}
            <Link to="/how-it-works" className="btn-outline lp-cta-btn">How it works</Link>
          </div>
          <p className="lp-hero-trust">No KYC · Wallet auto-generated · Unspent credits always withdrawable</p>
        </div>
      </section>

      {/* ── Section 2: Featured auction ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-label">
            {featured?.status === 'active' ? (
              <><span className="live-dot" /> LIVE NOW</>
            ) : featured ? 'COMING SOON' : 'AUCTIONS'}
          </div>
          <div className="lp-feat-wrap">
            {featured ? <FeaturedCard auction={featured} /> : <MockFeaturedCard />}
          </div>
          <div className="lp-section-link">
            <Link to="/auctions">View all auctions →</Link>
          </div>
        </div>
      </section>

      {/* ── Section 3: How it works ── */}
      <section className="lp-section lp-section--alt">
        <div className="lp-section-inner">
          <div className="lp-section-label">HOW IT WORKS</div>
          <div className="lp-steps">
            {[
              { n: 1, title: 'Deposit SOL, get credits',  body: '1 credit = 0.01 SOL. Unspent credits are always withdrawable.' },
              { n: 2, title: 'Bid on auctions',           body: 'Each bid costs 1 credit, raises the price by $0.01, and resets the 15s snap timer.' },
              { n: 3, title: 'Last bidder wins',          body: 'When the timer hits zero, the final bidder buys the item at the auction price.' },
            ].map(s => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-body">{s.body}</div>
              </div>
            ))}
          </div>
          <div className="lp-section-link">
            <Link to="/how-it-works">Read the full guide →</Link>
          </div>
        </div>
      </section>

      {/* ── Section 4: Recent wins ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-label">RECENT WINS</div>
          <div className="lp-wins-row">
            {winsToShow.map((w, i) => (
              <WinCard key={i} win={w} example={showExampleWins} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Why pennyBid ── */}
      <section className="lp-section lp-section--alt">
        <div className="lp-section-inner">
          <div className="lp-section-label">WHY PENNYBID</div>
          <div className="lp-why-row">
            {[
              { icon: '🔗', title: 'Built on Solana',           body: 'Fast, low-fee transactions. Your deposit wallet is generated instantly — no setup needed.' },
              { icon: '🎲', title: 'Provably fair raffles',      body: 'Every cashback raffle is committed before the auction starts. Verify the result yourself with a browser console.' },
              { icon: '🔥', title: '$penny buyback & burn',      body: '50% of platform revenue buys and burns $penny. Every bid makes the token more scarce.' },
            ].map(c => (
              <div key={c.title} className="lp-why-card">
                <div className="lp-why-icon">{c.icon}</div>
                <div className="lp-why-title">{c.title}</div>
                <div className="lp-why-body">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Final CTA ── */}
      <section className="lp-section lp-final-cta">
        <div className="lp-section-inner lp-final-cta-inner">
          <h2 className="lp-final-headline">Ready to bid?</h2>
          <p className="lp-final-sub">Create a free account in 10 seconds. No KYC, no wallet setup.</p>
          {primaryCta}
          {!user && (
            <p className="lp-final-login">
              Already have an account? <Link to="/login">Sign in →</Link>
            </p>
          )}
        </div>
      </section>

    </div>
  );
}
