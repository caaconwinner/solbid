import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { AuctionCard } from '../components/AuctionCard';
import type { AuctionListing } from '../types';

// ── Sidebar HIW components ───────────────────────────────────────
function SideArrow() {
  return (
    <div className="hs-arrow">
      <svg width="16" height="28" viewBox="0 0 16 28" fill="none">
        <line x1="8" y1="0" x2="8" y2="18" stroke="var(--orange)" strokeWidth="1.5" strokeDasharray="3 2"/>
        <polygon points="8,28 2,16 14,16" fill="var(--orange)" />
      </svg>
    </div>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="hs-card">
      <div className="hs-card-head">
        <span className="hs-card-num">{n}</span>
        <span className="hs-card-title">{title}</span>
      </div>
      <div className="hs-card-visual">{children}</div>
    </div>
  );
}

function SidebarHIW() {
  return (
    <div className="hs-flow">
      <StepCard n={1} title="Deposit SOL">
        <Link to="/account#deposit" className="hs-pack hs-pack--active hs-pack--single hs-pack--link">
          <div className="hs-pack-num">100</div>
          <div className="hs-pack-lbl">credits</div>
          <div className="hs-pack-sol">1 SOL →</div>
        </Link>
        <div className="hs-note">1 credit = 0.01 SOL · unspent credits always withdrawable</div>
      </StepCard>

      <SideArrow />

      <StepCard n={2} title="Pick an auction">
        <div className="hs-mini-card hs-mini-card--active hs-mini-card--single">
          <div className="hs-mini-img">🎮</div>
          <div className="hs-mini-name">PS5 Console</div>
          <div className="hs-mini-price">$0.13</div>
          <div className="hs-mini-timer">2:47 left</div>
        </div>
      </StepCard>

      <SideArrow />

      <StepCard n={3} title="Bid — timer resets">
        <div className="hs-bid-demo">
          <div className="hs-timer hs-timer--critical">
            <div className="hs-timer-lbl">Time left</div>
            <div className="hs-timer-val">0:05</div>
          </div>
          <div className="hs-bid-arrow">→</div>
          <div className="hs-timer">
            <div className="hs-timer-lbl">Time left</div>
            <div className="hs-timer-val">0:15</div>
          </div>
        </div>
        <div className="hs-note">Each bid costs 1 credit &amp; raises price $0.01</div>
      </StepCard>

      <SideArrow />

      <StepCard n={4} title="Last bidder wins the right to buy">
        <div className="hs-winner-card">
          <div className="hs-winner-icon">🏆</div>
          <div className="hs-winner-info">
            <div className="hs-winner-name">You won!</div>
            <div className="hs-winner-price">PS5 — purchase at $1.43</div>
          </div>
        </div>
      </StepCard>

      <SideArrow />

      <StepCard n={5} title="Cashback raffle">
        <div className="hs-raffle">
          <div className="hs-raffle-drum">🎰 You won the raffle!</div>
          <div className="hs-raffle-sub">+12 bonus credits</div>
        </div>
        <div className="hs-note">One random bidder wins credits back at auction end</div>
      </StepCard>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────
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

  const winners = past.filter((a) => a.leaderName).slice(0, 10);

  return (
    <div className="page home-layout">
      <aside className="home-sidebar">
        <h3 className="hiw-title">How it works</h3>
        <SidebarHIW />
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

      {winners.length > 0 && (
        <aside className="winners-sidebar">
          <h3 className="hiw-title">Recent Winners</h3>
          <div className="winners-list">
            {winners.map((a) => (
              <div key={a.auctionId} className="winner-card">
                <img className="winner-card-img" src={a.item.image} alt={a.item.name} />
                <div className="winner-card-info">
                  <div className="winner-card-name">{a.item.name}</div>
                  <div className="winner-card-user">🏆 {a.leaderName}</div>
                  <div className="winner-card-price">${a.currentPrice.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
