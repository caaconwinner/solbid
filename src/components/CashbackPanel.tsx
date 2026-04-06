import { useEffect, useRef, useState } from 'react';
import type { CashbackParticipant, CashbackWinner } from '../types';

interface Props {
  participants: CashbackParticipant[];
  winner:       CashbackWinner | null;
  userId:       string;
  ended:        boolean;
}

export function CashbackPanel({ participants, winner, userId, ended }: Props) {
  const eligible = participants;

  // Three phases: 'live' (normal rolling), 'spinning' (fast spin animation), 'revealed' (show winner)
  // If winner already present on mount (e.g. page refresh after auction ended), skip to revealed
  const [phase, setPhase] = useState<'live' | 'spinning' | 'revealed'>((winner || ended) ? 'revealed' : 'live');
  const [animIdx, setAnimIdx] = useState(0);
  const prevWinner = useRef<CashbackWinner | null>(winner);
  const iidRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tidRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Normal rolling while live
  useEffect(() => {
    if (phase !== 'live' || ended || eligible.length === 0) return;
    const id = setInterval(() => {
      setAnimIdx(i => (i + 1) % eligible.length);
    }, 400);
    return () => clearInterval(id);
  }, [phase, eligible.length, ended]);

  // Spin reveal when winner first arrives
  useEffect(() => {
    if (!winner || prevWinner.current) return;
    prevWinner.current = winner;

    // Auction already ended when winner data arrived (e.g. page refresh / navigation) — skip animation
    if (eligible.length === 0 || ended) { setPhase('revealed'); return; }

    const winnerId  = winner.userId ?? winner.user_id;
    const winnerIdx = eligible.findIndex(p => p.id === winnerId);
    const landing   = winnerIdx >= 0 ? winnerIdx : 0;

    setPhase('spinning');

    let idx = 0;
    const clearAll = () => {
      if (iidRef.current) clearInterval(iidRef.current);
      if (tidRef.current) clearTimeout(tidRef.current);
    };

    // Spin sequence: [ interval, duration ] pairs — fast → slow → land
    const steps: [number, number][] = [
      [60,  1400],
      [120, 1000],
      [220, 800],
      [380, 600],
    ];

    let stepIdx = 0;
    function runStep() {
      if (stepIdx >= steps.length) {
        clearAll();
        setAnimIdx(landing);
        tidRef.current = setTimeout(() => setPhase('revealed'), 700);
        return;
      }
      const [interval, duration] = steps[stepIdx];
      iidRef.current = setInterval(() => {
        idx = (idx + 1) % eligible.length;
        setAnimIdx(idx);
      }, interval);
      tidRef.current = setTimeout(() => {
        clearInterval(iidRef.current!);
        stepIdx++;
        runStep();
      }, duration);
    }

    runStep();
    return clearAll;
  }, [winner, eligible]);

  const rollingName = eligible.length > 0 ? (eligible[animIdx]?.username ?? '—') : '—';
  const rollingId   = eligible[animIdx]?.id;

  const winnerId   = winner?.userId ?? winner?.user_id;
  const winnerName = winner?.username ?? '—';
  const winnerAmt  = winner?.creditsRefunded ?? winner?.credits_refunded ?? 0;
  const isMyWin    = winnerId === userId;

  return (
    <div className="cashback-panel">
      <div className="cashback-header">
        <span className="cashback-icon">🎰</span>
        <div>
          <div className="cashback-title">Credit Cashback Raffle</div>
          <div className="cashback-sub">Every bidder is entered automatically</div>
        </div>
      </div>

      {/* Winner revealed */}
      {phase === 'revealed' && winner && (
        <div className={`cashback-winner-reveal ${isMyWin ? 'cashback-winner-reveal--you' : ''}`}>
          <div className="cashback-winner-emoji">{isMyWin ? '🎉' : '🏅'}</div>
          <div className="cashback-winner-name">{isMyWin ? 'You won!' : winnerName}</div>
          <div className="cashback-winner-amount">+{winnerAmt} bonus credits</div>
        </div>
      )}

      {/* Drum — shown while live or spinning */}
      {(phase === 'live' || phase === 'spinning') && (
        <>
          {eligible.length > 0 ? (
            <>
              <div className="cashback-drum">
                <div
                  key={`${phase}-${animIdx}`}
                  className={`cashback-drum-name ${phase === 'spinning' ? 'cashback-drum-name--spin' : ''}`}
                >
                  {rollingId === userId ? '⭐ You' : rollingName}
                </div>
                <div className="cashback-drum-sub">
                  {phase === 'spinning' ? 'picking winner…' : 'could win'}
                </div>
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
                  <div className="cashback-more">+{eligible.length - 6} more in raffle</div>
                )}
              </div>
            </>
          ) : (
            <div className="cashback-empty">
              No bids yet — be the first to enter!
            </div>
          )}

          {phase === 'live' && (
            <div className="cashback-disclaimer">
              At auction end, 1 random bidder wins back their bid count as bonus credits (non-refundable, bid-only).
            </div>
          )}
        </>
      )}
    </div>
  );
}
