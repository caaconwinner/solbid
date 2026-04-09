import { useTimer } from '../hooks/useTimer';

interface Props {
  endsAtMs:   number;
  clockDrift: number;
  ended?:     boolean;
  status?:    string;
  startsAtMs?: number;
}

export function Timer({ endsAtMs, clockDrift, ended, status, startsAtMs }: Props) {
  const scheduled = status === 'scheduled';
  const targetMs  = scheduled && startsAtMs ? startsAtMs : endsAtMs;

  const ms      = useTimer(ended ? null : targetMs, clockDrift);
  const seconds = ms / 1000;

  const urgent   = !ended && !scheduled && seconds <= 15;
  const critical = !ended && !scheduled && seconds <= 5;

  const display = ended
    ? 'ENDED'
    : seconds >= 60
      ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
      : seconds.toFixed(1) + 's';

  const label = ended ? 'ENDED' : scheduled ? 'STARTS IN' : 'TIME LEFT';

  return (
    <div
      className="timer"
      data-urgent={urgent}
      data-critical={critical}
      data-ended={ended}
      aria-label={ended ? 'Auction ended' : `${seconds.toFixed(1)} seconds remaining`}
    >
      <span className="timer-label">{label}</span>
      <span className="timer-value">{ended ? '' : display}</span>
    </div>
  );
}
