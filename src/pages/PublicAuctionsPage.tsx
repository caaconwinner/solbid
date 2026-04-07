import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useTimer } from '../hooks/useTimer';
import type { AuctionListing } from '../types';

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function AuctionTimer({ endsAtMs, startsAtMs, status }: { endsAtMs: number; startsAtMs?: number; status: string }) {
  const activeMs    = useTimer(status === 'active' ? endsAtMs : null, 0);
  const scheduledMs = useTimer(status === 'scheduled' && startsAtMs ? startsAtMs : null, 0);
  const seconds     = activeMs / 1000;

  if (status === 'scheduled') {
    return startsAtMs
      ? <span className="card-status scheduled">starts in {formatCountdown(scheduledMs)}</span>
      : <span className="card-status scheduled">UPCOMING</span>;
  }
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

function PublicCard({ auction }: { auction: AuctionListing }) {
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
          <AuctionTimer endsAtMs={auction.endsAtMs} startsAtMs={auction.startsAtMs} status={auction.status} />
        </div>
        <div className="pub-auction-meta">
          {auction.totalBids} bids
          {auction.leaderName && !ended && <span> · leader: <strong>{auction.leaderName}</strong></span>}
          {auction.leaderName &&  ended && <span> · won by <strong>{auction.leaderName}</strong></span>}
        </div>
        <div className="pub-auction-retail">
          Retail: <strong>${auction.item.retailValue.toLocaleString()}</strong>
        </div>
      </div>
    </div>
  );
}

export function PublicAuctionsPage() {
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
            setError(err.message ?? 'Failed to load');
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

  return (
    <div className="pub-auctions-page">
      <div className="pub-auctions-header">
        <Link to="/login" className="auth-logo" style={{ textDecoration: 'none' }}>penny<strong>Bid</strong></Link>
        <div className="pub-auctions-header-cta">
          <Link to="/"         className="btn-primary"  style={{ fontSize: 13, padding: '7px 18px' }}>Sign in to bid</Link>
          <Link to="/register" className="btn-outline"  style={{ fontSize: 13, padding: '7px 18px' }}>Create account</Link>
        </div>
      </div>

      <h2 className="pub-auctions-title">Auctions</h2>

      {loading && (
        <div className="loading-screen"><div className="spinner" /><p>Loading auctions…</p></div>
      )}
      {error && <p style={{ color: 'var(--red)', textAlign: 'center' }}>{error}</p>}
      {!loading && !error && auctions.length === 0 && (
        <div className="empty-state"><p>No auctions right now. Check back soon.</p></div>
      )}

      {live.length > 0 && (
        <section className="pub-auctions-section">
          <h3 className="pub-auctions-section-title"><span className="live-dot" /> Live Now</h3>
          <div className="pub-auctions-grid">
            {live.map(a => <PublicCard key={a.auctionId} auction={a} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="pub-auctions-section">
          <h3 className="pub-auctions-section-title">Upcoming</h3>
          <div className="pub-auctions-grid">
            {upcoming.map(a => <PublicCard key={a.auctionId} auction={a} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="pub-auctions-section">
          <h3 className="pub-auctions-section-title">Recently Ended</h3>
          <div className="pub-auctions-grid">
            {past.map(a => <PublicCard key={a.auctionId} auction={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
