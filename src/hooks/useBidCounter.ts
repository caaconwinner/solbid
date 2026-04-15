import { useEffect, useState } from 'react';

export function useBidCounter() {
  const [totalBids, setTotalBids] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch_() {
      try {
        const r = await fetch('/api/stats');
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setTotalBids(d.totalBids);
      } catch { /* ignore */ }
    }
    fetch_();
    const id = setInterval(fetch_, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return totalBids;
}
