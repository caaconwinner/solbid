import { useEffect, useRef, useState } from 'react';
import type { CashbackParticipant, CashbackWinner } from '../types';

interface Props {
  participants:  CashbackParticipant[];
  winner:        CashbackWinner | null;
  raffleSettled: boolean;
  userId:        string;
  ended:         boolean;
  leaderId:      string | null;
}

type Phase = 'idle' | 'spinning' | 'revealed';

// Fast → slow spin steps: [interval between ticks ms, total duration ms]
const SPIN_STEPS: [number, number][] = [
  [60,  1400],
  [120, 1000],
  [220,  800],
  [380,  600],
];

export function CashbackPanel({ participants, winner, raffleSettled, userId, ended, leaderId }: Props) {
  // Raffle pool: all bidders except the auction winner (once auction ends)
  const eligible = ended
    ? participants.filter(p => p.id !== leaderId)
    : participants;

  const winnerId   = winner?.userId ?? winner?.user_id ?? null;
  const winnerName = winner?.username ?? '—';
  const winnerAmt  = winner?.creditsRefunded ?? winner?.credits_refunded ?? 0;
  const isMyWin    = winnerId === userId;

  // Start 'revealed' immediately if winner already known (refresh / rejoin)
  const [phase, setPhase]           = useState<Phase>(winner ? 'revealed' : 'idle');
  const [displayIdx, setDisplayIdx] = useState(0);

  // Which winner ID we've already animated — prevents re-running on re-renders
  const seenWinnerId = useRef(winnerId);
  const iidRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const tidsRef      = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    if (iidRef.current) { clearInterval(iidRef.current); iidRef.current = null; }
    tidsRef.current.forEach(clearTimeout);
    tidsRef.current = [];
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // No winner yet, or already animated this winner
    if (!winner || seenWinnerId.current === winnerId) return;
    seenWinnerId.current = winnerId;

    // Server confirmed raffle already ran before this session → skip animation
    if (raffleSettled || eligible.length === 0) {
      setPhase('revealed');
      return;
    }

    // Snapshot the raffle pool and find where the winner sits
    const snap       = [...eligible];
    const landingIdx = Math.max(0, snap.findIndex(p => p.id === winnerId));

    setPhase('spinning');

    let idx = 0;

    function runSteps(steps: typeof SPIN_STEPS) {
      if (steps.length === 0) {
        // Land on the winner then reveal
        setDisplayIdx(landingIdx);
        tidsRef.current.push(setTimeout(() => setPhase('revealed'), 700));
        return;
      }
      const [[interval, duration], ...rest] = steps;
      iidRef.current = setInterval(() => {
        idx = (idx + 1) % snap.length;
        setDisplayIdx(idx);
      }, interval);
      tidsRef.current.push(setTimeout(() => {
        clearInterval(iidRef.current!);
        iidRef.current = null;
        runSteps(rest);
      }, duration));
    }

    runSteps(SPIN_STEPS);
    return clearAll;
  }, [winnerId]); // keyed on ID string — object reference changes from re-sync won't interrupt

  const displayName = eligible[displayIdx]?.username ?? '—';
  const displayId   = eligible[displayIdx]?.id;

  return (
    <div className="cashback-panel">
      <div className="cashback-header">
        <img src="/raffle-icon.png" className="cashback-icon" alt="raffle" />
        <div>
          <div className="cashback-title">Credit Cashback Raffle</div>
          <div className="cashback-sub">Every bidder is entered automatically</div>
        </div>
      </div>

      {winner && phase !== 'spinning' ? (
        /* Winner card — short-circuit: if winner exists and we're not mid-animation, show immediately */
        <div className={`cashback-winner-reveal ${isMyWin ? 'cashback-winner-reveal--you' : ''}`}>
          <div className="cashback-winner-emoji">{isMyWin ? '🎉' : '🏅'}</div>
          <div className="cashback-winner-name">{isMyWin ? 'You won!' : winnerName}</div>
          <div className="cashback-winner-amount">+{winnerAmt} bonus credits</div>
        </div>
      ) : (
        /* Idle list, with spinning drum overlaid while animating */
        <>
          {phase === 'spinning' && (
            <div className="cashback-drum">
              <div key={displayIdx} className="cashback-drum-name cashback-drum-name--spin">
                {displayId === userId ? '⭐ You' : displayName}
              </div>
              <div className="cashback-drum-sub">picking winner…</div>
            </div>
          )}

          {eligible.length > 0 ? (
            <div className="cashback-list">
              {eligible.slice(0, 10).map(p => (
                <div key={p.id} className={`cashback-row ${p.id === userId ? 'cashback-row--you' : ''}`}>
                  <span className="cashback-row-name">{p.id === userId ? '⭐ You' : p.username}</span>
                  <span className="cashback-row-bids">{p.total_bids} {p.total_bids === 1 ? 'bid' : 'bids'}</span>
                </div>
              ))}
              {eligible.length > 10 && (
                <div className="cashback-more">+{eligible.length - 10} more in raffle</div>
              )}
            </div>
          ) : (
            <div className="cashback-empty">
              {participants.length > 0
                ? 'Only the auction winner bid — no cashback this round.'
                : 'No bids yet — be the first to enter!'}
            </div>
          )}

          {phase === 'idle' && (
            <div className="cashback-disclaimer">
              At auction end, 1 random bidder wins back their bid count as bonus credits (non-refundable, bid-only).
            </div>
          )}
        </>
      )}
    </div>
  );
}
