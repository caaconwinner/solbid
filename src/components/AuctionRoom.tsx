import { useEffect, useRef, useState } from 'react';
import { useAuction } from '../hooks/useAuction';
import { Timer }        from './Timer';
import { PriceDisplay } from './PriceDisplay';
import { BidButton }    from './BidButton';
import { BidFeed }      from './BidFeed';
import { CashbackPanel } from './CashbackPanel';
import { Link, useLocation } from 'react-router-dom';
import type { AuctionListing } from '../types';

interface Props {
  auctionId:        string;
  userId:           string;
  onCreditsChange?: (credits: number) => void;
  initialAuction?:  AuctionListing;
  winClaimed?:      boolean;
}

export function AuctionRoom({ auctionId, userId, onCreditsChange, initialAuction, winClaimed }: Props) {
  const { auction, bids, userCredits, clockDrift, isConnected, bidResult, viewers, cashback, cashbackSettled, placeBid, liveRetailUsd } =
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

  const ended   = auction.status === 'ended' || auction.status === 'settled';
  const isGuest = !userId;
  const location = useLocation();

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
            {liveRetailUsd != null ? (
              <>
                <span className="item-retail-live">LIVE</span>
                <span className="item-retail-label">RETAIL VALUE:</span>
                <span className="item-retail-value">${liveRetailUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </>
            ) : (
              <>
                <span className="item-retail-label">RETAIL VALUE:</span>
                <span className="item-retail-value">${auction.item.retailValue.toLocaleString()}</span>
              </>
            )}
          </p>
          {auction.prizeMint && (
            <p className="item-prize-mint">
              <span className="item-prize-mint-label">TOKEN MINT:</span>
              <a
                className="item-prize-mint-addr"
                href={`https://solscan.io/token/${auction.prizeMint}`}
                target="_blank"
                rel="noreferrer"
                title={auction.prizeMint}
              >
                {auction.prizeMint}
              </a>
            </p>
          )}
          <p className="item-bids">
            {auction.totalBids} bids placed
            {viewers > 0 && <span className="item-viewers"> · 👁 {viewers} watching</span>}
          </p>
        </div>
      </div>

      <div className="live-state">
        <PriceDisplay price={auction.currentPrice} />
        <Timer endsAtMs={auction.endsAtMs} clockDrift={clockDrift} ended={ended} status={auction.status} startsAtMs={auction.startsAtMs} />
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

      {!ended && isGuest && (
        <div className="guest-bid-cta">
          <Link to={`/register?next=${encodeURIComponent(location.pathname)}`} className="btn-primary">
            Create account to bid
          </Link>
          <Link to="/login" className="btn-outline">Login</Link>
        </div>
      )}

      {!ended && !isGuest && (
        <BidButton
          credits={userCredits}
          onBid={placeBid}
          disabled={auction.status !== 'active'}
          result={bidResult}
          connecting={!isConnected && auction.status === 'active'}
          isLeader={auction.leaderId === userId}
        />
      )}

      {ended && (
        <div className="winner-banner" data-own={auction.leaderId === userId}>
          {auction.leaderId === userId ? (
            <div className="winner-banner-inner">
              <span>🎉 You won this auction!</span>
              <div className="winner-share-row">
                {winClaimed
                  ? <span className="win-claimed-badge">✓ Claimed</span>
                  : <Link to="/account?tab=wins" className="btn-primary" style={{ fontSize: 14, padding: '6px 16px' }}>Claim →</Link>
                }
                <a
                  className="winner-share-btn winner-share-btn--x"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just won "${auction.item.name}" for $${auction.currentPrice.toFixed(2)} on pennyBid! 🎉\n\npenny.bid`)}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Share on X"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Share
                </a>
                <a
                  className="winner-share-btn winner-share-btn--tg"
                  href={`https://t.me/share/url?url=${encodeURIComponent('https://penny.bid')}&text=${encodeURIComponent(`I just won "${auction.item.name}" for $${auction.currentPrice.toFixed(2)} on pennyBid! 🎉`)}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Share on Telegram"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Share
                </a>
              </div>
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
          raffleSettled={cashbackSettled}
          userId={userId}
          ended={ended}
          leaderId={auction.leaderId}
          raffleCommitment={cashback.raffleCommitment ?? null}
        />
        <BidFeed bids={bids.slice(0, 100)} userId={userId} />
      </div>
    </div>
  );
}
