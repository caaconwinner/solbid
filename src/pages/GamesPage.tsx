import { useEffect, useState } from 'react';

const TAPE_TEXT = Array.from({ length: 16 }, () => '⚠ UNDER CONSTRUCTION ').join('');

export function GamesPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="games-page">
      <div className="games-split">

        {/* ── Left — Slots ──────────────────────────────────── */}
        <div className="games-embed-panel">
          <iframe
            src={ready ? '/slots?preview=1' : undefined}
            className="games-embed-frame"
            title="Slots preview"
            scrolling="no"
          />
          <div className="games-embed-blocker" />
        </div>

        {/* ── Center divider ─────────────────────────────────── */}
        <div className="games-center-divider" />

        {/* ── Right — Crash ─────────────────────────────────── */}
        <div className="games-embed-panel">
          <iframe
            src={ready ? '/crash?preview=1' : undefined}
            className="games-embed-frame"
            title="Crash preview"
            scrolling="no"
          />
          <div className="games-embed-blocker" />
        </div>

        {/* ── Construction tape ─────────────────────────────── */}
        <div className="games-tape-wrap" aria-hidden="true">
          <div className="games-tape">
            <span className="games-tape-text">{TAPE_TEXT}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
