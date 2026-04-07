import { useEffect, useRef, useState } from 'react';
import { useAuction } from '../hooks/useAuction';
import { Timer }        from './Timer';
import { PriceDisplay } from './PriceDisplay';
import { BidButton }    from './BidButton';
import { BidFeed }      from './BidFeed';
import { CashbackPanel } from './CashbackPanel';
import { Link }         from 'react-router-dom';
import type { AuctionListing } from '../types';

interface Props {
  auctionId:        string;
  userId:           string;
  onCreditsChange?: (credits: number) => void;
  initialAuction?:  AuctionListing;
  winClaimed?:      boolean;
}

export function AuctionRoom({ auctionId, userId, onCreditsChange, initialAuction, winClaimed }: Props) {
  const { auction, bids, userCredits, clockDrift, isConnected, bidResult, viewers, cashback, placeBid } =
    useAuction(auctionId, userId, initialAuction);

  useEffect(() => { onCreditsChange?.(userCredits); }, [userCredits]);

  // Outbid flash — fires when the current user loses the leader spot
  const prevLeaderId = useRef<string | null>(null);
  const [outbid, setOutbid] = useState(false);

  useEffect(() => {
    if (!auction) return;
    if (prevLeaderId.current === userId && auction.leaderId !== userId && auction.leaderId !== null) {
      setOutbid(true);
      const t = setTimeout(() => setOutbid(false), 1200);
      return () => clearTimeout(t);
    }
    prevLeaderId.current = auction.leaderId;
  }, [auction?.leaderId, userId]);

  if (!auction) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Connecting to auction…</p>
      </div>
    );
  }

  const ended = auction.status === 'ended' || auction.status === 'settled';

  return (
    <div className="auction-room">
      {!isConnected && (
        <div className="offline-banner" role="alert">Connection lost — reconnecting…</div>
      )}

      <div className="item-card">
        <div className="item-image-wrap">
          <img className="item-image" src={auction.item.image} alt={auction.item.name} />
          {ended && <div className="ended-overlay">AUCTION ENDED</div>}
        </div>
        <div className="item-meta">
          <h1 className="item-name">{auction.item.name}</h1>
          <p className="item-retail">
            Retail value: <strong>${auction.item.retailValue.toLocaleString()}</strong>
          </p>
          <p className="item-bids">
            {auction.totalBids} bids placed
            {viewers > 0 && <span className="item-viewers"> · 👁 {viewers} watching</span>}
          </p>
        </div>
      </div>

      <div className="live-state">
        <PriceDisplay price={auction.currentPrice} />
        <Timer endsAtMs={auction.endsAtMs} clockDrift={clockDrift} ended={ended} />
      </div>

      <div className="leader-bar" data-outbid={outbid}>
        {auction.leaderName ? (
          <>
            <span className="leader-crown">👑</span>
            <span className="leader-label">CURRENT LEADER</span>
            <span className="leader-name" data-own={auction.leaderId === userId}>
              {auction.leaderId === userId ? 'YOU' : auction.leaderName}
            </span>
          </>
        ) : (
          <span className="leader-label">No bids yet — be first!</span>
        )}
      </div>

      {!ended && (
        <BidButton
          credits={userCredits}
          onBid={placeBid}
          disabled={auction.status !== 'active'}
          result={bidResult}
          connecting={!isConnected && auction.status === 'active'}
        />
      )}

      {ended && (
        <div className="winner-banner" data-own={auction.leaderId === userId}>
          {auction.leaderId === userId ? (
            <div className="winner-banner-inner">
              <span>🎉 You won this auction!</span>
              {winClaimed
                ? <span className="win-claimed-badge">✓ Claimed</span>
                : <Link to="/account" className="btn-primary" style={{ fontSize: 14, padding: '6px 16px' }}>Claim →</Link>
              }
            </div>
          ) : (
            `${auction.leaderName} won at $${auction.currentPrice.toFixed(2)}`
          )}
        </div>
      )}

      <div className="auction-bottom">
        <CashbackPanel
          participants={cashback.participants}
          winner={cashback.winner}
          userId={userId}
          ended={ended}
        />
        <BidFeed bids={bids.slice(0, 100)} userId={userId} />
      </div>
    </div>
  );
}
