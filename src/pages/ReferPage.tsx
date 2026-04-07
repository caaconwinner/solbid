import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Reuse arrow from HowItWorks style ───────────────────────────
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

// ── Mock referral link card ──────────────────────────────────────
function MockRefLink({ code }: { code: string }) {
  return (
    <div className="ref-mock-link-wrap">
      <div className="ref-mock-label">Your referral link</div>
      <div className="ref-mock-row">
        <div className="ref-mock-input">penny.bid/register?ref=<strong>{code}</strong></div>
        <div className="ref-mock-copy-btn">Copy</div>
      </div>
      <div className="ref-mock-stats">
        <div className="ref-mock-stat">
          <span className="ref-mock-stat-val">3</span>
          <span className="ref-mock-stat-label">signed up</span>
        </div>
        <div className="ref-mock-stat-divider" />
        <div className="ref-mock-stat">
          <span className="ref-mock-stat-val" style={{ color: 'var(--orange)' }}>+30</span>
          <span className="ref-mock-stat-label">credits earned</span>
        </div>
      </div>
    </div>
  );
}

// ── Mock user signup flow ────────────────────────────────────────
function MockSignupFlow() {
  return (
    <div className="ref-mock-flow">
      <div className="ref-mock-flow-step">
        <div className="ref-mock-flow-icon">🔗</div>
        <div className="ref-mock-flow-text">Friend clicks your link</div>
      </div>
      <div className="ref-mock-flow-arrow">→</div>
      <div className="ref-mock-flow-step">
        <div className="ref-mock-flow-icon">📝</div>
        <div className="ref-mock-flow-text">They register an account</div>
      </div>
      <div className="ref-mock-flow-arrow">→</div>
      <div className="ref-mock-flow-step">
        <div className="ref-mock-flow-icon">💸</div>
        <div className="ref-mock-flow-text">Deposit ≥ 0.045 SOL</div>
      </div>
      <div className="ref-mock-flow-arrow">→</div>
      <div className="ref-mock-flow-step ref-mock-flow-step--last">
        <div className="ref-mock-flow-icon">🎯</div>
        <div className="ref-mock-flow-text">Place 1 bid</div>
      </div>
    </div>
  );
}

// ── Mock reward card ─────────────────────────────────────────────
function MockReward() {
  return (
    <div className="ref-mock-reward-wrap">
      <div className="ref-mock-reward-card">
        <div className="ref-mock-reward-icon">🎁</div>
        <div className="ref-mock-reward-title">Referral Reward</div>
        <div className="ref-mock-reward-amount">+10 bonus credits</div>
        <div className="ref-mock-reward-sub">credited to your account</div>
        <div className="ref-mock-reward-note">Bid-only · non-withdrawable</div>
      </div>
      <div className="ref-mock-reward-note-outer">
        Reward fires automatically once — no action needed from you.
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export function ReferPage() {
  const { user } = useAuth();
  const refLink = user?.refCode
    ? `${window.location.origin}/register?ref=${user.refCode}`
    : null;

  const copy = () => {
    if (!refLink) return;
    navigator.clipboard.writeText(refLink);
    toast.success('Referral link copied!');
  };

  return (
    <div className="hiw-page">
      <div className="hiw-hero">
        <h1 className="hiw-hero-title">Refer &amp; earn</h1>
        <p className="hiw-hero-sub">
          Share your unique link. When a friend signs up, deposits at least 0.045 SOL, and places their first bid,
          you automatically receive <strong style={{ color: 'var(--orange)' }}>+10 bonus credits</strong>.
        </p>
        {refLink ? (
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={copy}>
            Copy your referral link
          </button>
        ) : (
          <Link to="/register" className="btn-primary" style={{ marginTop: 16 }}>
            Create an account to get your link
          </Link>
        )}
      </div>

      <div className="hiw-container">

        {/* ── Step 1: Your link ── */}
        <Step n={1} title="Get your unique referral link"
          body="Every account has a unique 6-character referral code. Your link is always on your account page — or click Refer in the header to copy it instantly.">
          <MockRefLink code={user?.refCode ?? 'A3KX9Q'} />
        </Step>

        <Arrow />

        {/* ── Step 2: Friend's journey ── */}
        <Step n={2} title="Share it — your friend completes the steps"
          body="They need to register via your link, deposit at least 0.045 SOL, and place at least one bid. That's all — the reward fires automatically.">
          <MockSignupFlow />
        </Step>

        <Arrow />

        {/* ── Step 3: You get rewarded ── */}
        <Step n={3}
          title={<>You get <span style={{ color: 'var(--orange)' }}>+10 bonus credits</span></>}
          body="Credits land in your account the moment your friend places their qualifying bid. No claiming needed — check your account page to see them.">
          <MockReward />
        </Step>

        {/* ── FAQ ── */}
        <div className="hiw-faq">
          <h2 className="hiw-faq-title">Questions</h2>
          <div className="hiw-faq-grid">
            {[
              { q: 'How many people can I refer?', a: 'Unlimited. Every qualifying referral earns you +10 bonus credits, with no cap.' },
              { q: 'What counts as a qualifying referral?', a: 'Your friend must register using your link, deposit at least 0.045 SOL, and place at least one bid. All three conditions must be met.' },
              { q: 'Can my referral link be disabled?', a: 'Referral links that show signs of abuse may be disabled by the platform. If yours is disabled, contact support.' },
              { q: 'Are bonus credits the same as regular credits?', a: 'Bonus credits are bid-only — they work exactly like regular credits for bidding, but cannot be withdrawn as SOL.' },
              { q: 'When exactly do I receive the credits?', a: 'The moment your friend places their first bid after depositing enough SOL. It is automatic — you will see your credit balance update.' },
              { q: 'Does my friend get anything?', a: 'Not currently — the bonus is a thank-you to the referrer only.' },
            ].map(({ q, a }) => (
              <div key={q} className="hiw-faq-item">
                <div className="hiw-faq-q">{q}</div>
                <div className="hiw-faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hiw-cta">
          {refLink ? (
            <button className="btn-outline" onClick={copy}>Copy referral link</button>
          ) : (
            <Link to="/register" className="btn-outline">Create account &amp; start referring</Link>
          )}
          <Link to="/auctions" className="btn-outline">View live auctions</Link>
        </div>

      </div>
    </div>
  );
}
