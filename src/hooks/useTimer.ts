import { useState, useEffect } from 'react';

/**
 * Server-authoritative countdown.
 * Computes remaining time from the server's endsAtMs endpoint,
 * corrected for clock drift between server and client.
 * Ticks every 100ms — matches the server "Tick" broadcast interval.
 */
export function useTimer(endsAtMs: number | null, clockDrift: number): number {
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  useEffect(() => {
    if (!endsAtMs) return;

    const tick = () => {
      const serverNow = Date.now() + clockDrift;
      setTimeLeftMs(Math.max(0, endsAtMs - serverNow));
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAtMs, clockDrift]);

  return timeLeftMs;
}
