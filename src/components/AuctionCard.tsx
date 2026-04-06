import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTimer } from '../hooks/useTimer';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket';
import type { AuctionListing } from '../types';

interface Props {
  auction: AuctionListing;
}

function MiniTimer({ endsAtMs, status }: { endsAtMs: number; status: string }) {
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

export function AuctionCard({ auction }: Props) {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const active    = auction.status === 'active';
  const ended     = auction.status === 'ended' || auction.status === 'settled';
  const [pending, setPending] = useState(false);
  const joinedRef = useRef(false);

  // Join auction room so we receive bid-confirmed/rejected
  useEffect(() => {
    if (!active) return;
    if (!joinedRef.current) {
      socket.emit('join-auction', auction.auctionId);
      joinedRef.current = true;
    }
  }, [active, auction.auctionId]);

  const placeBid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pending || !user || (user.credits + (user.bonusCredits ?? 0)) < 1) return;
    setPending(true);

    // Ensure joined before bidding
    if (!joinedRef.current) {
      socket.emit('join-auction', auction.auctionId);
      joinedRef.current = true;
    }

    const cleanup = () => { socket.off('bid-confirmed', onConfirmed); socket.off('bid-rejected', onRejected); };
    const onConfirmed = () => { cleanup(); setPending(false); toast.success('Bid placed!', { duration: 1500 }); };
    const onRejected  = ({ reason }: { reason?: string } = {}) => {
      cleanup(); setPending(false);
      if (reason === 'ALREADY_LEADER') toast('You are already the winning bid!', { icon: '👑', duration: 3000 });
      else toast.error('Bid rejected');
    };

    socket.once('bid-confirmed', onConfirmed);
    socket.once('bid-rejected',  onRejected);
    socket.emit('place-bid', { auctionId: auction.auctionId });

    setTimeout(() => { cleanup(); setPending(false); }, 2500);
  };

  const credits = user ? user.credits + (user.bonusCredits ?? 0) : 0;

  return (
    <div
      className="auction-card"
      data-ended={ended}
      onClick={() => navigate(`/auction/${auction.auctionId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/auction/${auction.auctionId}`)}
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
            <span className="card-stat-value card-stat-value--green">${auction.currentPrice.toFixed(2)}</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-label">Time left</span>
            <MiniTimer endsAtMs={auction.endsAtMs} status={auction.status} />
          </div>
        </div>

        <div className="card-footer">
          <span className="card-bids">{auction.totalBids} bids</span>
          {auction.viewers != null && auction.viewers > 0 && (
            <span className="card-viewers">👁 {auction.viewers}</span>
          )}
          <span className="card-retail">Retail ${auction.item.retailValue.toLocaleString()}</span>
        </div>

        {active ? (
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
