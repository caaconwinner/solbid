import { useEffect, useState } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuctionRoom } from '../components/AuctionRoom';
import { DepositAddress } from '../components/DepositAddress';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { AuctionListing } from '../types';

export function AuctionPage() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const { user, token } = useAuth();
  const location      = useLocation();
  const initialAuction = (location.state as { auction?: AuctionListing } | null)?.auction;
  const [liveCredits, setLiveCredits] = useState<number | null>(null);
  const [winClaimed, setWinClaimed]   = useState(false);

  useEffect(() => {
    if (!token || !auctionId) return;
    api.myWins(token).then(({ wins }) => {
      const match = wins.find(w => w.auctionId === auctionId);
      if (match?.purchased) setWinClaimed(true);
    }).catch(() => {});
  }, [token, auctionId]);

  if (!auctionId || !user) return <Navigate to="/" replace />;

  return (
    <div className="auction-page-wrap">
      <Link to="/auctions" className="back-link">← All auctions</Link>
      <div className="auction-page-layout">
      {/* Main auction */}
      <div className="auction-page-main">
        <AuctionRoom auctionId={auctionId} userId={user.id} onCreditsChange={setLiveCredits} initialAuction={initialAuction} winClaimed={winClaimed} />
      </div>

      {/* Account panel */}
      <aside className="auction-page-account">
        <div className="account-panel">
          <div className="account-panel-section">
            <p className="account-panel-label">CREDITS</p>
            <p className="account-panel-credits">{liveCredits ?? user.credits}</p>
            <p className="account-panel-hint">Each bid costs 1 credit (0.01 SOL)</p>
          </div>

          <div className="account-panel-section">
            <p className="account-panel-label">DEPOSIT SOL</p>
            <DepositAddress address={user.depositAddress} />
          </div>

          <Link to="/account" className="account-panel-link">
            Full Account →
          </Link>

          <div className="account-panel-section">
            <p className="account-panel-label">HOW IT WORKS</p>
            <ol className="hiw-list">
              <li>Send SOL to your deposit address above.</li>
              <li>Credits appear within <strong>~15 seconds</strong>.</li>
              <li>Each bid costs <strong>0.01 SOL</strong> and raises the price by <strong>$0.01 USD</strong>.</li>
              <li>When ≤15 seconds remain, each bid resets the timer to 15s. Last bidder wins the <strong>right to purchase</strong> the item at the final price in SOL.</li>
            </ol>
          </div>
        </div>
      </aside>
    </div>
    </div>
  );
}
