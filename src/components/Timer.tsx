import { useTimer } from '../hooks/useTimer';

interface Props {
  endsAtMs: number;
  clockDrift: number;
}

export function Timer({ endsAtMs, clockDrift }: Props) {
  const ms = useTimer(endsAtMs, clockDrift);
  const seconds = ms / 1000;

  const urgent   = seconds <= 15;  // battle phase — every bid resets from here
  const critical = seconds <= 5;

  // Display as mm:ss below 60s, else just seconds
  const display =
    seconds >= 60
      ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
      : seconds.toFixed(1) + 's';

  return (
    <div
      className="timer"
      data-urgent={urgent}
      data-critical={critical}
      aria-label={`${seconds.toFixed(1)} seconds remaining`}
    >
      <span className="timer-label">TIME LEFT</span>
      <span className="timer-value">{display}</span>
    </div>
  );
}
