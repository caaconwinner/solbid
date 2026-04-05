import { useEffect, useState } from 'react';
import { socket } from '../socket';

export type PingStatus = 'good' | 'slow' | 'offline';

export function usePing(): { status: PingStatus; latencyMs: number | null } {
  const [status, setStatus]       = useState<PingStatus>('offline');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      if (!socket.connected) { setStatus('offline'); setLatencyMs(null); return; }
      const t0 = Date.now();
      socket.volatile.emit('ping-check', () => {
        const ms = Date.now() - t0;
        setLatencyMs(ms);
        setStatus(ms < 150 ? 'good' : 'slow');
      });
    }

    const interval = setInterval(measure, 3000);
    socket.on('connect',    measure);
    socket.on('disconnect', () => { setStatus('offline'); setLatencyMs(null); });
    measure();

    return () => {
      clearInterval(interval);
      socket.off('connect',    measure);
      socket.off('disconnect');
    };
  }, []);

  return { status, latencyMs };
}
