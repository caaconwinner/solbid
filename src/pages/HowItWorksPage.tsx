import { Link } from 'react-router-dom';

// ── Inline mock auction card ─────────────────────────────────────
function MockAuction({
  name, price, bids, timeLeft, winner, ended, highlighted,
}: {
  name: string; price: string; bids: number; timeLeft: string;
  winner?: string; ended?: boolean; highlighted?: boolean;
}) {
  return (
    <div className="hiw-mock-card" data-highlighted={highlighted} data-ended={ended}>
      <div className="hiw-mock-image">
        <span className="hiw-mock-icon">
          {name.includes('PS5') ? '🎮' : name.includes('iPhone') ? '📱' : name.includes('Watch') ? '⌚' : '💻'}
        </span>
      </div>
      <div className="hiw-mock-body">
        <div className="hiw-mock-name">{name}</div>
        {winner ? (
          <div className="hiw-mock-winner">🏆 Won by <strong>{winner}</strong></div>
        ) : (
          <>
            <div className="hiw-mock-price">${price}</div>
            <div className="hiw-mock-meta">
              <span>{bids} bids placed</span>
              {!ended && <span className="hiw-mock-timer">{timeLeft}</span>}
              {ended  && <span className="hiw-mock-ended">ENDED</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Arrow between steps ──────────────────────────────────────────
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

// ── Step block ───────────────────────────────────────────────────
function Step({ n, title, body, children }: {
  n: number; title: string; body: string; children?: React.ReactNode;
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

// ── Bid feed mock ────────────────────────────────────────────────
function MockBidFeed() {
  const bids = [
    { user: 'you',     price: '$0.16', ago: 'just now',  you: true  },
    { user: 'shadow99', price: '$0.15', ago: '2s ago',   you: false },
    { user: 'xLancer',  price: '$0.14', ago: '5s ago',   you: false },
    { user: 'you',      price: '$0.13', ago: '9s ago',   you: true  },
  ];
  return (
    <div className="hiw-feed">
      <div className="hiw-feed-header">Last 10 Bids</div>
      {bids.map((b, i) => (
        <div key={i} className={`hiw-feed-row ${b.you ? 'hiw-feed-you' : ''}`}>
          <span className="hiw-feed-user">{b.you ? '⭐ you' : b.user}</span>
          <span className="hiw-feed-price">{b.price}</span>
          <span className="hiw-feed-ago">{b.ago}</span>
        </div>
      ))}
    </div>
  );
}

// ── Credit pack mock ─────────────────────────────────────────────
function MockCreditPack({ credits, sol, highlighted }: { credits: number; sol: string; highlighted?: boolean }) {
  return (
    <div className={`hiw-pack ${highlighted ? 'hiw-pack--active' : ''}`}>
      <div className="hiw-pack-credits">{credits}</div>
      <div className="hiw-pack-label">credits</div>
      <div className="hiw-pack-price">{sol} SOL</div>
    </div>
  );
}

// ── Timer mock ───────────────────────────────────────────────────
function MockTimer({ seconds, ended }: { seconds: string; ended?: boolean }) {
  return (
    <div className={`hiw-timer ${ended ? 'hiw-timer--ended' : seconds === '0:05' ? 'hiw-timer--critical' : ''}`}>
      <div className="hiw-timer-label">Time left</div>
      <div className="hiw-timer-value">{ended ? 'ENDED' : seconds}</div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export function HowItWorksPage() {
  return (
    <div className="hiw-page">
      <div className="hiw-hero">
        <h1 className="hiw-hero-title">How penny<strong>Bid</strong> works</h1>
        <p className="hiw-hero-sub">
          Penny auctions let you win high-value items for a fraction of retail price —
          every bid costs one credit. When under 15 seconds remain, each bid resets the timer.
        </p>
      </div>

      <div className="hiw-container">

        {/* ── Step 1: Deposit ── */}
        <Step n={1} title="Deposit SOL & get bid credits"
          body="1 credit = 0.01 SOL. Credits are non-refundable once bid. Unspent credits are always fully refundable — withdraw them as SOL anytime.">
          <div className="hiw-packs">
            <MockCreditPack credits={10}  sol="0.10" />
            <MockCreditPack credits={50}  sol="0.50" highlighted />
            <MockCreditPack credits={100} sol="1.00" />
          </div>
          <div className="hiw-pack-note">Unspent credits can always be withdrawn as SOL</div>
        </Step>

        <Arrow />

        {/* ── Step 2: Find an auction ── */}
        <Step n={2} title="Pick an auction to enter"
          body="Browse live and upcoming auctions. Each starts at $0.01. Every bid raises the price by $0.01 and resets the countdown.">
          <div className="hiw-cards-row">
            <MockAuction name="PS5 Console" price="0.13" bids={13} timeLeft="2:47" />
            <MockAuction name="iPhone 16 Pro" price="0.07" bids={7} timeLeft="14:22" highlighted />
            <MockAuction name="Apple Watch" price="0.24" bids={24} timeLeft="0:09" />
          </div>
        </Step>

        <Arrow />

        {/* ── Step 3: Bid ── */}
        <Step n={3} title="Place your bid — timer resets"
          body="Each bid costs 1 credit. The price goes up $0.01. If the timer is in snap-mode (≤ 15s), your bid resets it to 15s. Be the last one before 0!">
          <div className="hiw-bid-demo">
            <div className="hiw-bid-left">
              <MockTimer seconds="0:05" />
              <div className="hiw-bid-action">
                <div className="hiw-bid-btn">Place Bid  <span className="hiw-bid-cost">−1 credit</span></div>
              </div>
            </div>
            <div className="hiw-bid-arrow">→</div>
            <div className="hiw-bid-right">
              <MockTimer seconds="0:15" />
              <div className="hiw-bid-badge">Timer reset!</div>
            </div>
          </div>
          <MockBidFeed />
        </Step>

        <Arrow />

        {/* ── Step 4: Last bidder wins ── */}
        <Step n={4} title="Last bidder when the timer hits zero wins"
          body="When the countdown reaches 0 with no new bids, the auction ends. The final bidder wins the right to purchase the item at the final price in SOL — often 90–99% off retail.">
          <div className="hiw-cards-row hiw-cards-row--center">
            <div>
              <MockAuction name="PS5 Console" price="1.43" bids={143} timeLeft="" ended winner="shadow99" />
            </div>
          </div>
          <div className="hiw-winner-note">
            PS5 worth $499 — sold for <strong>$1.43</strong> · 143 bids × $0.01 = $1.43 in price + 143 credits spent = platform revenue
          </div>
        </Step>

        <Arrow />

        {/* ── Step 5: Claim ── */}
        <Step n={5} title="Winner claims — runner-ups keep playing"
          body={'Winners get a "Claim \u2192" button that links to their account where they can arrange item delivery. Didn\'t win? Your remaining credits are still yours to bid with or withdraw.'}>
          <div className="hiw-claim-demo">
            <div className="hiw-claim-banner">
              🏆 You won! <Link to="/account" className="hiw-claim-btn">Claim &#8594;</Link>
            </div>
            <div className="hiw-credits-note">
              <span className="hiw-credits-badge">7 credits remaining</span>
              <span className="hiw-credits-sub">= 0.07 SOL withdrawable</span>
            </div>
          </div>
        </Step>

        <Arrow />

        {/* ── Bonus: Cashback raffle ── */}
        <Step n={6} title="Cashback raffle — every bidder gets a chance"
          body="At the end of every auction, one random bidder is picked and wins back their total bid count as bonus credits. You are entered automatically just by bidding — no extra steps needed.">
          <div className="hiw-cashback-demo">
            <div className="hiw-cashback-panel">
              <div className="hiw-cashback-head">🎰 Credit Cashback Raffle</div>
              <div className="hiw-cashback-drum">shadow99</div>
              <div className="hiw-cashback-drum-sub">could win</div>
              <div className="hiw-cashback-rows">
                {[
                  { name: '⭐ You',    bids: 8, you: true },
                  { name: 'shadow99', bids: 12, you: false },
                  { name: 'xLancer',  bids: 4,  you: false },
                ].map(r => (
                  <div key={r.name} className={`hiw-cashback-row ${r.you ? 'hiw-cashback-row--you' : ''}`}>
                    <span>{r.name}</span><span>{r.bids} bids</span>
                  </div>
                ))}
              </div>
              <div className="hiw-cashback-note">
                At auction end, 1 random bidder wins bonus credits equal to their bid count (non-refundable, bid-only).
              </div>
            </div>
            <div className="hiw-cashback-winner">
              <div className="hiw-cashback-win-emoji">🏅</div>
              <div className="hiw-cashback-win-name">shadow99</div>
              <div className="hiw-cashback-win-amount">+12 bonus credits</div>
              <div className="hiw-cashback-win-sub">Non-refundable · use to bid</div>
            </div>
          </div>
        </Step>

        {/* ── FAQ ── */}
        <div className="hiw-faq">
          <h2 className="hiw-faq-title">Common questions</h2>
          <div className="hiw-faq-grid">
            {[
              { q: 'Are credits refundable?', a: 'Credits used to bid are not refundable — that\'s how the auction model works. Unspent credits can always be withdrawn as SOL.' },
              { q: 'What is snap-mode?', a: 'When the timer drops to 15 seconds or below, any new bid resets it back to 15s. During the long countdown phase, bids don\'t affect the timer.' },
              { q: 'Can I get sniped at the last second?', a: 'Yes — that\'s the game! The snap timer means the auction can\'t end until 15 full seconds pass with no bids. Watch the feed and time your bids.' },
              { q: 'What happens to my SOL after I bid?', a: 'Your credits decrease by 1 per bid. The SOL backing those credits is swept to the platform. Only unspent credits retain SOL value.' },
              { q: 'Is my wallet safe?', a: 'Your deposit wallet is custodial (we hold the key) and encrypted with AES-256-GCM. Only withdrawal and sweep operations ever sign a transaction.' },
              { q: 'How is the auction price so low?', a: 'The price only goes up $0.01 per bid, so even 200 bids = $2.00. Winners get high-value items for a fraction of retail.' },
            ].map(({ q, a }) => (
              <div key={q} className="hiw-faq-item">
                <div className="hiw-faq-q">{q}</div>
                <div className="hiw-faq-a">{a}</div>
              </div>
            ))}
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
