import { useEffect, useRef, useState } from 'react';
import type { CashbackParticipant, CashbackWinner } from '../types';

interface Props {
  participants:     CashbackParticipant[];
  winner:           CashbackWinner | null;
  raffleSettled:    boolean;
  userId:           string;
  ended:            boolean;
  leaderId:         string | null;
  raffleCommitment: string | null;
}

type Phase = 'idle' | 'spinning' | 'revealed';

// Fast → slow spin steps: [interval between ticks ms, total duration ms]
const SPIN_STEPS: [number, number][] = [
  [60,  1400],
  [120, 1000],
  [220,  800],
  [380,  600],
];

async function verifySha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function CashbackPanel({ participants, winner, raffleSettled, userId, ended, leaderId, raffleCommitment }: Props) {
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

  // Provably fair verify state
  const [verifyResult, setVerifyResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [showProof, setShowProof]       = useState(false);

  const handleVerify = async () => {
    if (!winner?.raffleSeed || !winner?.raffleCommitment || !winner?.drawHash || !winner?.participantsSnapshot) return;
    try {
      const commitCheck = await verifySha256(winner.raffleSeed);
      const drawCheck   = await verifySha256(`${winner.raffleSeed}:${winner.participantsSnapshot}`);
      const ok = commitCheck === winner.raffleCommitment && drawCheck === winner.drawHash;
      setVerifyResult(ok ? 'ok' : 'fail');
    } catch { setVerifyResult('fail'); }
  };

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

          {/* Provably fair proof section */}
          {winner.raffleSeed && (
            <div className="raffle-proof">
              <button className="raffle-proof-toggle" onClick={() => setShowProof(p => !p)}>
                🔍 {showProof ? 'Hide' : 'Verify'} provably fair draw
              </button>
              {showProof && (
                <div className="raffle-proof-body">
                  <div className="raffle-proof-row">
                    <span className="raffle-proof-label">Seed (revealed)</span>
                    <code className="raffle-proof-val">{winner.raffleSeed}</code>
                  </div>
                  <div className="raffle-proof-row">
                    <span className="raffle-proof-label">Commitment sha256(seed)</span>
                    <code className="raffle-proof-val">{winner.raffleCommitment}</code>
                  </div>
                  <div className="raffle-proof-row">
                    <span className="raffle-proof-label">Draw hash sha256(seed:participants)</span>
                    <code className="raffle-proof-val">{winner.drawHash}</code>
                  </div>
                  <div className="raffle-proof-row">
                    <span className="raffle-proof-label">Participants (id:bids, sorted)</span>
                    <code className="raffle-proof-val raffle-proof-val--wrap">{winner.participantsSnapshot}</code>
                  </div>
                  <button className="raffle-proof-verify-btn" onClick={handleVerify}>
                    Run verification in browser
                  </button>
                  {verifyResult === 'ok' && (
                    <div className="raffle-proof-status raffle-proof-status--ok">✓ Verified — draw is fair</div>
                  )}
                  {verifyResult === 'fail' && (
                    <div className="raffle-proof-status raffle-proof-status--fail">✗ Verification failed</div>
                  )}
                </div>
              )}
            </div>
          )}
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
              {raffleCommitment && (
                <span className="raffle-commitment-pill" title={raffleCommitment}>
                  🔒 Seed committed
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
