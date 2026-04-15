const TAPE_TEXT = Array.from({ length: 16 }, () => '⚠ UNDER CONSTRUCTION ').join('');

export function GamesPage() {
  return (
    <div className="games-page">
      <div className="games-split">

        {/* ── Left — Slots ──────────────────────────────────── */}
        <div className="games-embed-panel">
          <iframe
            src="/slots?preview=1"
            className="games-embed-frame"
            title="Slots preview"
            scrolling="no"
          />
          {/* Transparent blocker — catches all pointer events so game is unplayable */}
          <div className="games-embed-blocker" />
        </div>

        {/* ── Center divider ─────────────────────────────────── */}
        <div className="games-center-divider" />

        {/* ── Right — Crash ─────────────────────────────────── */}
        <div className="games-embed-panel">
          <iframe
            src="/crash?preview=1"
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
