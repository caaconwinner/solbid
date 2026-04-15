import { useState } from 'react';
import { BidResult } from '../types';

interface Props {
  credits:     number;
  onBid:       () => void;
  disabled:    boolean;
  result:      BidResult;
  connecting?: boolean;
  isLeader?:   boolean;
}

export function BidButton({ credits, onBid, disabled, result, connecting, isLeader }: Props) {
  // Client-side cooldown prevents double-tap spam while server confirms
  const [cooling, setCooling] = useState(false);

  const handleClick = () => {
    if (cooling || disabled || credits < 1 || connecting) return;
    onBid();
    setCooling(true);
    setTimeout(() => setCooling(false), 600);
  };

  const noCredits = credits < 1;
  const inactive  = disabled || noCredits || !!connecting;

  return (
    <div className="bid-action">
      <button
        className="bid-btn"
        data-cooling={cooling}
        data-rejected={result === 'rejected'}
        onClick={handleClick}
        disabled={inactive}
        aria-label="Place a bid"
      >
        <span className="bid-btn-text">
          {connecting ? 'CONNECTING…' : cooling ? 'BIDDING…' : noCredits ? 'NO CREDITS' : isLeader ? 'WINNING BID' : 'BID NOW'}
        </span>
        <span className="bid-btn-cost">−0.01 SOL credit</span>
      </button>

      <div className="credit-balance">
        <span className="credit-count">{credits}</span>
        <span className="credit-label"> credits</span>
      </div>

      {result === 'rejected' && (
        <p className="bid-error">
          {isLeader
            ? '🏆 You have the winning bid — hold on!'
            : 'Bid rejected — auction may have ended'}
        </p>
      )}
    </div>
  );
}
