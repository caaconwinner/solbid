import { useNavigate } from 'react-router-dom';
import { useTimer } from '../hooks/useTimer';
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
  const navigate = useNavigate();
  const active   = auction.status === 'active';

  return (
    <div
      className="auction-card"
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
            <span className="card-stat-value">${auction.currentPrice.toFixed(2)}</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-label">Time left</span>
            <MiniTimer endsAtMs={auction.endsAtMs} status={auction.status} />
          </div>
        </div>

        <div className="card-footer">
          <span className="card-bids">{auction.totalBids} bids</span>
          <span className="card-retail">Retail ${auction.item.retailValue.toLocaleString()}</span>
        </div>

        <div className="card-enter">
          {active ? 'Enter Auction →' : 'View Auction →'}
        </div>
      </div>
    </div>
  );
}
