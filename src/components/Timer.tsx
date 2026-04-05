import { useTimer } from '../hooks/useTimer';

interface Props {
  endsAtMs: number;
  clockDrift: number;
  ended?: boolean;
}

export function Timer({ endsAtMs, clockDrift, ended }: Props) {
  const ms = useTimer(endsAtMs, clockDrift);
  const seconds = ms / 1000;

  const urgent   = !ended && seconds <= 15;
  const critical = !ended && seconds <= 5;

  const display = ended
    ? 'ENDED'
    : seconds >= 60
      ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
      : seconds.toFixed(1) + 's';

  return (
    <div
      className="timer"
      data-urgent={urgent}
      data-critical={critical}
      data-ended={ended}
      aria-label={ended ? 'Auction ended' : `${seconds.toFixed(1)} seconds remaining`}
    >
      <span className="timer-label">TIME LEFT</span>
      <span className="timer-value">{display}</span>
    </div>
  );
}
