import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { AuctionCard } from '../components/AuctionCard';
import type { AuctionListing } from '../types';

export function HomePage() {
  const { token }                           = useAuth();
  const [auctions, setAuctions]             = useState<AuctionListing[]>([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError('');

    const fetchAuctions = () =>
      api.auctions(token as string)
        .then(({ auctions: a }) => {
          setAuctions(a);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[home] auctions fetch failed:', err);
          setError(err.message ?? 'Failed to load auctions');
          setLoading(false);
        });

    fetchAuctions();
    const id = setInterval(fetchAuctions, 4000);
    return () => clearInterval(id);
  }, [token]);

  const live     = auctions.filter((a) => a.status === 'active').sort((a, b) => b.endsAtMs - a.endsAtMs);
  const upcoming = auctions.filter((a) => a.status === 'scheduled').sort((a, b) => a.endsAtMs - b.endsAtMs);
  const past     = auctions.filter((a) => a.status === 'ended' || a.status === 'settled').sort((a, b) => b.endsAtMs - a.endsAtMs);

  if (loading && auctions.length === 0) {
    return (
      <div className="page">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading auctions…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="loading-screen">
          <p style={{ color: 'var(--red)' }}>{error}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Make sure the dev server is running on port 3007.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page home-layout">
      <aside className="home-sidebar">
        <h3 className="hiw-title">How it works</h3>
        <div className="hs-steps">
          {[
            { n: 1, icon: '💳', title: 'Deposit SOL',       body: 'Send SOL to your deposit address. Credits appear within ~15 seconds.' },
            { n: 2, icon: '🎯', title: 'Pick an auction',   body: 'Browse live auctions. Each starts at $0.01.' },
            { n: 3, icon: '⚡', title: 'Place bids',        body: '1 bid = 1 credit = 0.01 SOL. Each bid raises the price $0.01 & resets the timer.' },
            { n: 4, icon: '🏆', title: 'Last bidder wins',  body: 'When the timer hits 0, the last bidder wins the right to purchase at the final price.' },
            { n: 5, icon: '🎰', title: 'Cashback raffle',   body: 'One random bidder wins their bid count back as bonus credits at auction end.' },
          ].map(({ n, icon, title, body }) => (
            <div key={n} className="hs-step">
              <div className="hs-step-head">
                <span className="hs-step-num">{n}</span>
                <span className="hs-step-icon">{icon}</span>
                <span className="hs-step-title">{title}</span>
              </div>
              <p className="hs-step-body">{body}</p>
            </div>
          ))}
        </div>
      </aside>

      <div className="home-auctions">
        {live.length > 0 && (
          <section className="auction-section">
            <h2 className="section-title">
              <span className="live-dot" />
              Live Now
            </h2>
            <div className="auction-grid">
              {live.map((a) => <AuctionCard key={a.auctionId} auction={a} />)}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="auction-section">
            <h2 className="section-title">Upcoming</h2>
            <div className="auction-grid">
              {upcoming.map((a) => <AuctionCard key={a.auctionId} auction={a} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="auction-section">
            <h2 className="section-title">Recently Ended</h2>
            <div className="auction-grid">
              {past.map((a) => <AuctionCard key={a.auctionId} auction={a} />)}
            </div>
          </section>
        )}

        {auctions.length === 0 && !loading && (
          <div className="empty-state">
            <p>No auctions right now. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
