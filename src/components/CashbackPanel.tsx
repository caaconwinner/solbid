import { useEffect, useState } from 'react';
import type { CashbackParticipant, CashbackWinner } from '../types';

interface Props {
  participants: CashbackParticipant[];
  winner:       CashbackWinner | null;
  userId:       string;
  ended:        boolean;
}

export function CashbackPanel({ participants, winner, userId, ended }: Props) {
  const eligible = participants.filter(p => p.real_bids > 0);

  // Rolling name animation — cycles through eligible bidders while live
  const [rollingIdx, setRollingIdx] = useState(0);
  const [spinning,   setSpinning]   = useState(false);

  useEffect(() => {
    if (ended || eligible.length === 0) return;
    setSpinning(true);
    const id = setInterval(() => {
      setRollingIdx(i => (i + 1) % eligible.length);
    }, 400);
    return () => { clearInterval(id); setSpinning(false); };
  }, [eligible.length, ended]);

  const rollingName = eligible.length > 0 ? eligible[rollingIdx]?.username ?? '—' : '—';
  const winnerId    = winner?.userId ?? winner?.user_id;
  const winnerName  = winner?.username ?? '—';
  const winnerAmt   = winner?.creditsRefunded ?? winner?.credits_refunded ?? 0;
  const isMyWin     = winnerId === userId;

  return (
    <div className="cashback-panel">
      <div className="cashback-header">
        <span className="cashback-icon">🎰</span>
        <div>
          <div className="cashback-title">Credit Cashback</div>
          <div className="cashback-sub">1 random bidder wins bonus credits back</div>
        </div>
      </div>

      {/* Winner reveal */}
      {winner && (
        <div className={`cashback-winner-reveal ${isMyWin ? 'cashback-winner-reveal--you' : ''}`}>
          <div className="cashback-winner-emoji">{isMyWin ? '🎉' : '🏅'}</div>
          <div className="cashback-winner-name">{isMyWin ? 'You won!' : winnerName}</div>
          <div className="cashback-winner-amount">+{winnerAmt} bonus credits</div>
        </div>
      )}

      {/* Live state */}
      {!winner && (
        <>
          {eligible.length > 0 ? (
            <>
              <div className="cashback-drum">
                <div className={`cashback-drum-name ${spinning ? 'cashback-drum-name--spin' : ''}`}>
                  {rollingName === userId ? '⭐ You' : rollingName}
                </div>
                <div className="cashback-drum-sub">could win</div>
              </div>

              <div className="cashback-list">
                {eligible.slice(0, 6).map(p => (
                  <div key={p.id} className={`cashback-row ${p.id === userId ? 'cashback-row--you' : ''}`}>
                    <span className="cashback-row-name">
                      {p.id === userId ? '⭐ You' : p.username}
                    </span>
                    <span className="cashback-row-bids">
                      {p.total_bids} {p.total_bids === 1 ? 'bid' : 'bids'}
                    </span>
                  </div>
                ))}
                {eligible.length > 6 && (
                  <div className="cashback-more">+{eligible.length - 6} more eligible</div>
                )}
              </div>
            </>
          ) : (
            <div className="cashback-empty">
              {ended ? 'No eligible bidders' : 'Bid to enter the raffle'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
