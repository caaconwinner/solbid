import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTimer } from '../hooks/useTimer';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket';
import type { AuctionListing } from '../types';

interface Props {
  auction: AuctionListing;
}

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function MiniTimer({ endsAtMs, startsAtMs, status }: { endsAtMs: number; startsAtMs?: number; status: string }) {
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

export function AuctionCard({ auction }: Props) {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const active    = auction.status === 'active';
  const ended     = auction.status === 'ended' || auction.status === 'settled';
  const [pending, setPending] = useState(false);
  const joinedRef = useRef(false);

  // Local live state — updated via socket so card reflects bids instantly
  const [livePrice,  setLivePrice]  = useState(auction.currentPrice);
  const [liveBids,   setLiveBids]   = useState(auction.totalBids);
  const [liveLeader, setLiveLeader] = useState(auction.leaderName);

  // Sync from parent if auction prop changes (e.g. initial load / poll refresh)
  useEffect(() => {
    setLivePrice(auction.currentPrice);
    setLiveBids(auction.totalBids);
    setLiveLeader(auction.leaderName);
  }, [auction.currentPrice, auction.totalBids, auction.leaderName]);

  // Listen to socket events for instant updates
  useEffect(() => {
    if (!active) return;
    const onBidPlaced = (e: { p: number; n: string }) => {
      setLivePrice(e.p);
      setLiveBids((b) => b + 1);
      setLiveLeader(e.n);
    };
    const onSync = (e: { auction: any }) => {
      if (e.auction?.auctionId !== auction.auctionId) return;
      setLivePrice(e.auction.currentPrice);
      setLiveBids(e.auction.totalBids);
      setLiveLeader(e.auction.leaderName);
    };
    socket.on('bid-placed',   onBidPlaced);
    socket.on('auction-sync', onSync);
    return () => {
      socket.off('bid-placed',   onBidPlaced);
      socket.off('auction-sync', onSync);
    };
  }, [active, auction.auctionId]);

  // Connect socket and join auction room when card is active
  useEffect(() => {
    if (!active) return;
    const join = () => {
      if (!joinedRef.current) {
        socket.emit('join-auction', auction.auctionId);
        joinedRef.current = true;
      }
    };
    if (socket.connected) {
      join();
    } else {
      socket.once('connect', join);
      socket.connect();
    }
    return () => { socket.off('connect', join); };
  }, [active, auction.auctionId]);

  const placeBid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pending || !user || (user.credits + (user.bonusCredits ?? 0)) < 1) return;
    setPending(true);

    const cleanup = () => { socket.off('bid-confirmed', onConfirmed); socket.off('bid-rejected', onRejected); };
    const onConfirmed = () => { cleanup(); setPending(false); toast.success('Bid placed!', { duration: 1500 }); };
    const onRejected  = ({ reason }: { reason?: string } = {}) => {
      cleanup(); setPending(false);
      if (reason === 'ALREADY_LEADER') toast('You are already the winning bid!', { icon: '👑', duration: 3000 });
      else toast.error('Bid rejected');
    };

    const doBid = () => {
      if (!joinedRef.current) {
        socket.emit('join-auction', auction.auctionId);
        joinedRef.current = true;
      }
      socket.once('bid-confirmed', onConfirmed);
      socket.once('bid-rejected',  onRejected);
      socket.emit('place-bid', { auctionId: auction.auctionId });
      setTimeout(() => { cleanup(); setPending(false); }, 2500);
    };

    if (socket.connected) {
      doBid();
    } else {
      socket.once('connect', doBid);
      socket.connect();
      setTimeout(() => { socket.off('connect', doBid); setPending(false); }, 3000);
    }
  };

  const credits = user ? user.credits + (user.bonusCredits ?? 0) : 0;

  return (
    <div
      className="auction-card"
      data-ended={ended}
      onClick={() => navigate(`/auction/${auction.auctionId}`, { state: { auction } })}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/auction/${auction.auctionId}`, { state: { auction } })}
    >
      <div className="card-image-wrap">
        <img className="card-image" src={auction.item.image} alt={auction.item.name} />
        {active && <div className="card-live-badge">LIVE</div>}
      </div>

      <div className="card-body">
        <p className="card-item-name">{auction.item.name}</p>

        <div className="card-stats">
          <div className="card-stat">
            <span className="card-stat-label">Current bid</span>
            <span className="card-stat-value card-stat-value--green">${livePrice.toFixed(2)}</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-label">Time left</span>
            <MiniTimer endsAtMs={auction.endsAtMs} startsAtMs={auction.startsAtMs} status={auction.status} />
          </div>
        </div>

        <div className="card-footer">
          <span className="card-bids">{liveBids} bids</span>
          {auction.viewers != null && auction.viewers > 0 && (
            <span className="card-viewers">👁 {auction.viewers}</span>
          )}
          <span className="card-retail">
            <span className="item-retail-label">RETAIL VALUE:</span>
            <span className="item-retail-value">${auction.item.retailValue.toLocaleString()}</span>
          </span>
        </div>

        {ended && liveLeader && (
          <div className="card-winner">🏆 {liveLeader} won at ${livePrice.toFixed(2)}</div>
        )}

        {active && !user ? (
          <Link to="/login" className="card-bid-btn card-bid-btn--guest" onClick={e => e.stopPropagation()}>
            Sign in to bid
          </Link>
        ) : active ? (
          <button
            className={`card-bid-btn ${pending ? 'card-bid-btn--pending' : ''}`}
            onClick={placeBid}
            disabled={pending || credits < 1}
          >
            {pending ? 'Bidding…' : credits < 1 ? 'No credits' : `Bid — 1 credit`}
          </button>
        ) : (
          <div className="card-enter">View Auction →</div>
        )}
      </div>
    </div>
  );
}
