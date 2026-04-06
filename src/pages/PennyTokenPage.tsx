import { Link } from 'react-router-dom';

function Arrow() {
  return (
    <div className="hiw-arrow">
      <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
        <line x1="12" y1="0" x2="12" y2="28" stroke="var(--orange)" strokeWidth="2" strokeDasharray="4 3"/>
        <polygon points="12,40 4,24 20,24" fill="var(--orange)" />
      </svg>
    </div>
  );
}

function Step({ n, title, body, children }: {
  n: number; title: React.ReactNode; body: string; children?: React.ReactNode;
}) {
  return (
    <div className="hiw-step">
      <div className="hiw-step-header">
        <span className="hiw-step-num">{n}</span>
        <div>
          <div className="hiw-step-title">{title}</div>
          <div className="hiw-step-body">{body}</div>
        </div>
      </div>
      {children && <div className="hiw-step-visual">{children}</div>}
    </div>
  );
}

// ── Mockup: pump.fun revenue card ─────────────────────────────────
function PumpFunMock() {
  return (
    <div className="penny-mock-pumpfun">
      <div className="penny-mock-pumpfun-header">
        <span className="penny-mock-pumpfun-dot" />
        <span style={{ color: 'var(--green)' }}>pump</span>.<span style={{ color: 'var(--green)' }}>fun</span> developer rewards
      </div>
      <div className="penny-mock-pumpfun-row">
        <span className="penny-mock-pumpfun-label">Trading volume (24h)</span>
        <span className="penny-mock-pumpfun-val">$1,240,000</span>
      </div>
      <div className="penny-mock-pumpfun-row">
        <span className="penny-mock-pumpfun-label">Dev reward rate</span>
        <span className="penny-mock-pumpfun-val">0.25%</span>
      </div>
      <div className="penny-mock-pumpfun-row penny-mock-pumpfun-row--highlight">
        <span className="penny-mock-pumpfun-label">→ Prize pool funded</span>
        <span className="penny-mock-pumpfun-val penny-mock-pumpfun-val--green">+$3,100</span>
      </div>
    </div>
  );
}

// ── Mockup: revenue split diagram ────────────────────────────────
function RevenueSplitMock() {
  return (
    <div className="penny-mock-split">
      <div className="penny-mock-split-title">Platform revenue split</div>
      <div className="penny-mock-split-bar">
        <div className="penny-mock-split-half penny-mock-split-half--burn">
          <div className="penny-mock-split-pct">50%</div>
          <div className="penny-mock-split-label">🔥 Buybacks &amp; Burns</div>
        </div>
        <div className="penny-mock-split-half penny-mock-split-half--ops">
          <div className="penny-mock-split-pct">50%</div>
          <div className="penny-mock-split-label">⚙️ Operations</div>
        </div>
      </div>
      <div className="penny-mock-split-notes">
        <div className="penny-mock-split-note penny-mock-split-note--burn">
          $penny purchased on market and burned — permanently reducing supply
        </div>
        <div className="penny-mock-split-note penny-mock-split-note--ops">
          Servers, RPC, development, prize pool top-ups
        </div>
      </div>
    </div>
  );
}

// ── Mockup: credit purchase comparison ───────────────────────────
function CreditCompareMock() {
  return (
    <div className="penny-mock-compare">
      <div className="penny-mock-compare-card penny-mock-compare-card--sol">
        <div className="penny-mock-compare-method">SOL credits</div>
        <div className="penny-mock-compare-rate">0.01 SOL = 1 credit</div>
        <div className="penny-mock-compare-tag penny-mock-compare-tag--refund">✓ Refundable if unspent</div>
      </div>
      <div className="penny-mock-compare-vs">vs</div>
      <div className="penny-mock-compare-card penny-mock-compare-card--penny">
        <div className="penny-mock-compare-method" style={{ color: 'var(--orange)' }}>$penny credits</div>
        <div className="penny-mock-compare-rate">1,000 $penny = 1 credit</div>
        <div className="penny-mock-compare-tag penny-mock-compare-tag--burn">🔥 Burns $penny · non-refundable</div>
      </div>
    </div>
  );
}

// ── Mockup: raffle paying out $penny ─────────────────────────────
function RaffleMock() {
  return (
    <div className="penny-mock-raffle">
      <div className="penny-mock-raffle-drum">🎰 Cashback Raffle</div>
      <div className="penny-mock-raffle-winner">
        <div className="penny-mock-raffle-emoji">🏅</div>
        <div>
          <div className="penny-mock-raffle-name">shadow99 wins</div>
          <div className="penny-mock-raffle-amount" style={{ color: 'var(--orange)' }}>+12,000 <strong>$penny</strong></div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export function PennyTokenPage() {
  return (
    <div className="hiw-page">
      <div className="hiw-hero">
        <h1 className="hiw-hero-title">
          The <span style={{ color: 'var(--orange)', fontWeight: 900 }}>$penny</span> token
        </h1>
        <p className="hiw-hero-sub">
          Every bid placed on pennyBid creates real economic activity that flows back into the{' '}
          <span style={{ color: 'var(--orange)' }}>$penny</span> ecosystem — through buybacks, burns, and prize pool funding.
        </p>
      </div>

      <div className="hiw-container">

        {/* ── Step 1: What is $penny ── */}
        <Step n={1}
          title={<><span style={{ color: 'var(--orange)' }}>$penny</span> is the native token of penny<span style={{ color: 'var(--orange)', fontWeight: 900 }}>Bid</span></>}
          body="$penny is a Solana SPL token launched on pump.fun. It powers the platform's reward mechanics, credit system, and buyback engine. Holding $penny gives you access to the auction economy.">
          <div className="penny-hero-token">
            <div className="penny-token-coin">
              <span style={{ fontSize: 48 }}>🪙</span>
            </div>
            <div className="penny-token-stats">
              <div className="penny-token-stat">
                <div className="penny-token-stat-label">Chain</div>
                <div className="penny-token-stat-val">Solana</div>
              </div>
              <div className="penny-token-stat">
                <div className="penny-token-stat-label">Launched on</div>
                <div className="penny-token-stat-val">pump.fun</div>
              </div>
              <div className="penny-token-stat">
                <div className="penny-token-stat-label">Ticker</div>
                <div className="penny-token-stat-val" style={{ color: 'var(--orange)' }}>$penny</div>
              </div>
              <div className="penny-token-stat">
                <div className="penny-token-stat-label">Supply model</div>
                <div className="penny-token-stat-val">Deflationary 🔥</div>
              </div>
            </div>
          </div>
        </Step>

        <Arrow />

        {/* ── Step 2: pump.fun dev rewards → prize pool ── */}
        <Step n={2}
          title={<><span style={{ color: 'var(--green)' }}>pump</span>.<span style={{ color: 'var(--green)' }}>fun</span> developer rewards fund the prize pool</>}
          body="pennyBid earns developer rewards from pump.fun every time $penny is traded. These rewards flow directly into the auction prize pool — meaning every trade on the open market makes prizes bigger for bidders.">
          <PumpFunMock />
        </Step>

        <Arrow />

        {/* ── Step 3: Revenue → buybacks & burns ── */}
        <Step n={3}
          title="50% of all platform revenue goes to buybacks & burns"
          body="Every bid placed on pennyBid generates revenue for the platform. Half of that revenue is used to buy $penny on the open market and burn it permanently — creating constant deflationary pressure as the platform grows.">
          <RevenueSplitMock />
        </Step>

        {/* ── Summary stats ── */}
        <div className="penny-summary">
          <div className="penny-summary-item">
            <div className="penny-summary-icon">🔥</div>
            <div className="penny-summary-title">Deflationary</div>
            <div className="penny-summary-body">Revenue buybacks purchase $penny on the open market and burn it permanently every day.</div>
          </div>
          <div className="penny-summary-item">
            <div className="penny-summary-icon">🏆</div>
            <div className="penny-summary-title">Funded prizes</div>
            <div className="penny-summary-body">pump.fun trading volume generates dev rewards that flow straight into the auction prize pool.</div>
          </div>
          <div className="penny-summary-item">
            <div className="penny-summary-icon">♻️</div>
            <div className="penny-summary-title">Closed loop</div>
            <div className="penny-summary-body">Bid → platform earns → buys $penny → burns → supply drops → $penny value supported.</div>
          </div>
        </div>

        <div className="hiw-cta">
          <Link to="/register" className="btn-outline">Create account &amp; start bidding</Link>
          <Link to="/auctions" className="btn-outline">View live auctions</Link>
        </div>

      </div>
    </div>
  );
}
