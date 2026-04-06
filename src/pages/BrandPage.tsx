import { useState } from 'react';

// ── Download SVG helper ───────────────────────────────────────────
function downloadSvg(svgContent: string, filename: string) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Logo SVGs ────────────────────────────────────────────────────
const LOGO_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60" viewBox="0 0 240 60">
  <rect width="240" height="60" fill="#111111"/>
  <text x="16" y="40" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="400" fill="#e0e0e0">penny</text>
  <text x="108" y="40" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="900" fill="#ff6200">Bid</text>
</svg>`;

const LOGO_LIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60" viewBox="0 0 240 60">
  <rect width="240" height="60" fill="#ffffff"/>
  <text x="16" y="40" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="400" fill="#111111">penny</text>
  <text x="108" y="40" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="900" fill="#ff6200">Bid</text>
</svg>`;

const LOGO_MONO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60" viewBox="0 0 240 60">
  <rect width="240" height="60" fill="#111111"/>
  <text x="16" y="40" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="400" fill="#e0e0e0">penny</text>
  <text x="108" y="40" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="900" fill="#e0e0e0">Bid</text>
</svg>`;

const TOKEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="56" fill="#ff6200"/>
  <circle cx="60" cy="60" r="50" fill="#cc4e00"/>
  <text x="60" y="52" font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="400" fill="rgba(255,255,255,0.8)" text-anchor="middle">penny</text>
  <text x="60" y="74" font-family="Inter,system-ui,sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">Bid</text>
</svg>`;

// ── Colour swatch ────────────────────────────────────────────────
function Swatch({ name, hex, dark }: { name: string; hex: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="brand-swatch" onClick={copy} title="Click to copy">
      <div className="brand-swatch-color" style={{ background: hex, border: dark ? '1px solid #333' : undefined }} />
      <div className="brand-swatch-name">{name}</div>
      <div className="brand-swatch-hex">{hex}</div>
      {copied && <div className="brand-swatch-copied">Copied!</div>}
    </div>
  );
}

// ── Logo card ────────────────────────────────────────────────────
function LogoCard({ label, bg, svgContent, filename }: {
  label: string; bg: string; svgContent: string; filename: string;
}) {
  return (
    <div className="brand-logo-card">
      <div className="brand-logo-preview" style={{ background: bg }}>
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      </div>
      <div className="brand-logo-footer">
        <span className="brand-logo-label">{label}</span>
        <button className="brand-dl-btn" onClick={() => downloadSvg(svgContent, filename)}>
          SVG ↓
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export function BrandPage() {
  const downloadAll = () => {
    downloadSvg(LOGO_DARK_SVG,  'pennybid-logo-dark.svg');
    setTimeout(() => downloadSvg(LOGO_LIGHT_SVG, 'pennybid-logo-light.svg'), 200);
    setTimeout(() => downloadSvg(LOGO_MONO_SVG,  'pennybid-logo-mono.svg'),  400);
    setTimeout(() => downloadSvg(TOKEN_SVG,       'pennybid-token.svg'),      600);
  };

  return (
    <div className="brand-page">
      {/* ── Header ── */}
      <div className="brand-hero">
        <div>
          <h1 className="brand-hero-title">Brand Assets</h1>
          <p className="brand-hero-sub">
            Everything you need to represent pennyBid correctly. Please don't alter, stretch, rotate,
            or create your own version of the logo. Always leave enough clear space around it.
          </p>
        </div>
        <button className="btn-primary brand-dl-all" onClick={downloadAll}>
          Download brand kit ↓
        </button>
      </div>

      {/* ── Logos ── */}
      <section className="brand-section">
        <h2 className="brand-section-title">Logos</h2>
        <div className="brand-logo-grid">
          <LogoCard label="Dark background" bg="#111111" svgContent={LOGO_DARK_SVG} filename="pennybid-logo-dark.svg" />
          <LogoCard label="Light background" bg="#ffffff" svgContent={LOGO_LIGHT_SVG} filename="pennybid-logo-light.svg" />
          <LogoCard label="Monochrome" bg="#111111" svgContent={LOGO_MONO_SVG} filename="pennybid-logo-mono.svg" />
        </div>
      </section>

      {/* ── Colours ── */}
      <section className="brand-section">
        <h2 className="brand-section-title">Colours</h2>

        <div className="brand-color-group-label">Primary</div>
        <div className="brand-swatches">
          <Swatch name="Orange"     hex="#ff6200" />
          <Swatch name="Green"      hex="#00e87a" />
          <Swatch name="Background" hex="#111111" dark />
          <Swatch name="White"      hex="#e0e0e0" dark />
        </div>

        <div className="brand-color-group-label" style={{ marginTop: 24 }}>Secondary</div>
        <div className="brand-swatches">
          <Swatch name="Surface"      hex="#181818" dark />
          <Swatch name="Surface 2"    hex="#1e1e1e" dark />
          <Swatch name="Border"       hex="#222222" dark />
          <Swatch name="Text muted"   hex="#aaaaaa" dark />
          <Swatch name="Red"          hex="#ff3b3b" />
          <Swatch name="Orange dim"   hex="#ff620020" dark />
        </div>
      </section>

      {/* ── Typography ── */}
      <section className="brand-section">
        <h2 className="brand-section-title">Typography</h2>
        <div className="brand-type-grid">
          <div className="brand-type-card">
            <div className="brand-type-sample" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Aa Bb Cc Dd
            </div>
            <div className="brand-type-name">Inter</div>
            <div className="brand-type-use">Body, UI, labels</div>
            <div className="brand-type-weights">
              <span style={{ fontWeight: 400 }}>Regular 400</span>
              <span style={{ fontWeight: 600 }}>SemiBold 600</span>
              <span style={{ fontWeight: 700 }}>Bold 700</span>
              <span style={{ fontWeight: 900 }}>Black 900</span>
            </div>
            <a
              className="brand-type-link"
              href="https://fonts.google.com/specimen/Inter"
              target="_blank"
              rel="noreferrer"
            >
              Google Fonts ↗
            </a>
          </div>

          <div className="brand-type-card">
            <div className="brand-type-sample" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              0.01 SOL
            </div>
            <div className="brand-type-name">JetBrains Mono</div>
            <div className="brand-type-use">Prices, timers, addresses</div>
            <div className="brand-type-weights">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 400 }}>Regular 400</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>Bold 700</span>
            </div>
            <a
              className="brand-type-link"
              href="https://fonts.google.com/specimen/JetBrains+Mono"
              target="_blank"
              rel="noreferrer"
            >
              Google Fonts ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── Token asset ── */}
      <section className="brand-section">
        <h2 className="brand-section-title">Token Asset</h2>
        <div className="brand-token-card">
          <div className="brand-token-preview">
            <div dangerouslySetInnerHTML={{ __html: TOKEN_SVG }} />
          </div>
          <div className="brand-token-info">
            <div className="brand-token-name">$penny token</div>
            <div className="brand-token-desc">
              The official <span style={{ color: 'var(--orange)' }}>$penny</span> token icon for use in
              listings, posts, and partner integrations.
            </div>
            <button className="brand-dl-btn" style={{ marginTop: 12 }} onClick={() => downloadSvg(TOKEN_SVG, 'pennybid-token.svg')}>
              Download SVG ↓
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
