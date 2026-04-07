import { BidEvent } from '../types';

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

interface Props {
  bids: BidEvent[];
  userId: string;
}

export function BidFeed({ bids, userId }: Props) {
  return (
    <div className="bid-feed-wrap">
      <div className="bid-feed-header">Last {bids.length} Bid{bids.length !== 1 ? 's' : ''}</div>
      <div className="bid-feed">
        {bids.map((bid, i) => (
          <div
            key={`${bid.s}-${bid.ts}-${i}`}
            className="bid-entry"
            data-own={bid.u === userId}
            data-new={i === 0}
          >
            <span className="bid-entry-name">{bid.n}</span>
            <span className="bid-entry-price">${bid.p.toFixed(2)}</span>
            <span className="bid-entry-time">{fmtTime(bid.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
