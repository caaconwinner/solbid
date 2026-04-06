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
        <ol className="hiw-list">
          <li>Send SOL to your deposit address on the <strong>Account</strong> page.</li>
          <li>Credits appear within <strong>~15 seconds</strong>.</li>
          <li>Each bid costs <strong>0.01 SOL</strong> (1 credit) and raises the price by <strong>$0.01 USD</strong>.</li>
          <li>When ≤15 seconds remain, each bid resets the timer to 15s. Last bidder wins the <strong>right to purchase</strong> the item at the final price in SOL.</li>
        </ol>
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
