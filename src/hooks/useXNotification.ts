import { useEffect, useState } from 'react';

const STORAGE_KEY = 'x_seen_tweet';
const POLL_MS = 5 * 60 * 1000; // 5 minutes

export function useXNotification() {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/x-latest');
        const { tweetId } = await res.json();
        if (!tweetId) return;
        const seen = localStorage.getItem(STORAGE_KEY);
        setHasNew(seen !== tweetId);
      } catch {}
    }

    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, []);

  function dismiss() {
    fetch('/api/x-latest')
      .then(r => r.json())
      .then(({ tweetId }) => {
        if (tweetId) localStorage.setItem(STORAGE_KEY, tweetId);
        setHasNew(false);
      })
      .catch(() => setHasNew(false));
  }

  return { hasNew, dismiss };
}
