import { Link } from 'react-router-dom';
import { SlotTilePreview } from '../components/SlotTilePreview';

const TAPE_TEXT = Array.from({ length: 14 }, () => '⚠ UNDER CONSTRUCTION ').join('');

export function GamesPage() {
  return (
    <div className="games-page">

      <div className="games-split">

        {/* ── Left panel — Slots ─────────────────────────── */}
        <Link to="/slots" className="games-panel games-panel--slots">
          <div className="games-panel-glow games-panel-glow--slots" />

          <div className="games-panel-icon">🎰</div>
          <h2 className="games-panel-title games-panel-title--slots">SLOTS</h2>
          <p className="games-panel-sub">Spin the reels, win big</p>

          <SlotTilePreview />

          <div className="games-panel-cta games-panel-cta--slots">Play Slots →</div>
        </Link>

        {/* ── Center divider ─────────────────────────────── */}
        <div className="games-center-divider" />

        {/* ── Right panel — Crash ────────────────────────── */}
        <Link to="/crash" className="games-panel games-panel--crash">
          <div className="games-panel-glow games-panel-glow--crash" />

          <div className="games-panel-icon">🚀</div>
          <h2 className="games-panel-title games-panel-title--crash">CRASH</h2>
          <p className="games-panel-sub">Ride the multiplier before it crashes</p>

          {/* Mini chart preview */}
          <svg className="games-crash-chart" viewBox="0 0 130 70" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,98,0,0.35)"/>
                <stop offset="100%" stopColor="rgba(255,98,0,0)"/>
              </linearGradient>
            </defs>
            {/* filled area */}
            <path d="M8 64 C20 62 38 55 55 42 C70 30 82 16 92 8 L96 4 L96 64 Z" fill="url(#chartFill)"/>
            {/* curve */}
            <path d="M8 64 C20 62 38 55 55 42 C70 30 82 16 92 8 L96 4" stroke="#ff6200" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            {/* crash X */}
            <line x1="96" y1="4"  x2="106" y2="14" stroke="#d93333" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="106" y1="4" x2="96"  y2="14" stroke="#d93333" strokeWidth="2.5" strokeLinecap="round"/>
            {/* multiplier label */}
            <text x="54" y="20" fill="#ffd700" fontSize="9" fontWeight="700" fontFamily="monospace">2.47×</text>
          </svg>

          <div className="games-panel-cta games-panel-cta--crash">Play Crash →</div>
        </Link>

        {/* ── Construction tape ──────────────────────────── */}
        <div className="games-tape-wrap" aria-hidden="true">
          <div className="games-tape">
            <span className="games-tape-text">{TAPE_TEXT}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
