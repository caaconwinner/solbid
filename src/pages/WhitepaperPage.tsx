export function WhitepaperPage() {
  return (
    <div className="legal-page">
      <div className="legal-container" style={{ maxWidth: 800 }}>

        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Official Document · April 2025
          </p>
          <h1 className="legal-title" style={{ fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: 12 }}>
            penny<strong style={{ color: 'var(--orange)' }}>Bid</strong> Whitepaper
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            A Solana-native penny auction platform and on-chain casino ecosystem powered by the <strong style={{ color: 'var(--orange)' }}>$penny</strong> token.
          </p>
        </div>

        {/* TOC */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 40 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Contents</p>
          {[
            ['1', 'Executive Summary'],
            ['2', 'The Problem & Opportunity'],
            ['3', 'Platform — Penny Auctions'],
            ['4', 'Casino Ecosystem'],
            ['5', '$penny Token Economics'],
            ['6', 'Token Listings & Discoverability'],
            ['7', 'Solscan Verification & On-chain Transparency'],
            ['8', 'Revenue Model'],
            ['9', 'Roadmap'],
            ['10', 'Community & Social'],
          ].map(([n, title]) => (
            <div key={n} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 700, minWidth: 24 }}>{n}.</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{title}</span>
            </div>
          ))}
        </div>

        {/* 1 */}
        <section className="legal-section">
          <h2>1. Executive Summary</h2>
          <p>
            pennyBid is a custodial penny auction platform and on-chain casino built entirely on Solana. Users deposit SOL, receive bid credits, and compete in fast-paced timed auctions for real-world and digital prizes — all settled on-chain. The platform is already live at <strong>penny.bid</strong> with real auctions, real prizes, and real on-chain settlement.
          </p>
          <p>
            Beyond auctions, pennyBid is expanding into a full on-chain casino suite — starting with provably fair slots and a crash game — creating a unified entertainment platform where <strong style={{ color: 'var(--orange)' }}>$penny</strong> is the engine behind every revenue flow, buyback, and reward.
          </p>
          <p>
            100% of platform activity — bids, deposits, withdrawals, prize claims — is verifiable on Solana. No black boxes.
          </p>
        </section>

        {/* 2 */}
        <section className="legal-section">
          <h2>2. The Problem & Opportunity</h2>
          <p>
            Traditional penny auction sites are opaque, centralized, and rife with trust issues — users have no way to verify fairness. Existing crypto casinos are either built on slow chains, require large minimum deposits, or offer no real utility token with verifiable buyback mechanics.
          </p>
          <p>
            pennyBid solves this by combining:
          </p>
          <p>
            <strong>· Provable on-chain settlement</strong> — every bid, deposit, withdrawal, and prize transfer is a real Solana transaction, publicly verifiable on Solscan.<br />
            <strong>· Low barrier to entry</strong> — 1 bid costs 0.01 SOL. Anyone can participate with fractions of a dollar.<br />
            <strong>· Real prizes</strong> — physical items, SOL, SPL tokens, digital gift cards. Not synthetic rewards.<br />
            <strong>· Token flywheel</strong> — platform revenue flows directly into $penny buybacks, creating constant demand.
          </p>
        </section>

        {/* 3 */}
        <section className="legal-section">
          <h2>3. Platform — Penny Auctions</h2>
          <p>
            Penny auctions are a hybrid between traditional auctions and a game of skill and timing. Each bid costs 1 credit (0.01 SOL) and raises the auction price by $0.01. The last bidder when the timer hits zero wins the right to purchase the item at the final auction price — which is typically far below retail value.
          </p>
          <p>
            <strong>Snap-mode timer:</strong> During the long countdown phase, bids do not reset the timer. When ≤15 seconds remain, any bid resets the clock to 15 seconds — creating high-stakes last-second competition.
          </p>
          <p>
            <strong>Cashback raffle:</strong> At the end of every auction, one random bidder (excluding the winner) wins back bonus credits equal to their total bid count. Provably fair — the commitment hash is published before the auction, the seed revealed after.
          </p>
          <p>
            <strong>Prize types:</strong> SOL (sent on-chain), SPL tokens, digital gift cards &amp; codes, physical items (shipped), and bid credits. Winners claim through the platform and can verify every transaction on Solscan.
          </p>
          <p>
            <strong>Custodial wallets:</strong> Each user gets an auto-generated Solana wallet. Private keys are AES-256-GCM encrypted with a server-side master key. Only withdrawal and prize operations ever sign transactions — keys are zeroed from memory immediately after use.
          </p>
        </section>

        {/* 4 */}
        <section className="legal-section">
          <h2>4. Casino Ecosystem</h2>
          <p>
            The auction platform is the foundation. pennyBid is building a full on-chain casino suite on top of it — starting with two games already in development and visible at <strong>penny.bid/games</strong>.
          </p>
          <p>
            <strong>Crash</strong> — a provably fair multiplier game. A rocket climbs an exponential curve; players cash out before it crashes. The longer you hold, the higher the reward — but crash at any moment ends everything. Built with a real-time canvas renderer, Trump-on-a-rocket visual, space objects at milestone multipliers, and milestone headlines.
          </p>
          <p>
            <strong>Slots</strong> — a Phaser-powered 5-reel slot machine with gradient tile graphics. PS5, iPhone, headphones, mystery gifts, and coins. Provably fair RNG, multipliers, and win animations.
          </p>
          <p>
            <strong>Upcoming games:</strong>
          </p>
          <p>
            · <strong>Plinko</strong> — drop a ball, watch it bounce through pegs, land on multipliers.<br />
            · <strong>Mines</strong> — reveal tiles on a grid, cash out before hitting a mine.<br />
            · <strong>Dice</strong> — classic over/under provably fair dice.<br />
            · <strong>Blackjack</strong> — SOL-wagered blackjack with on-chain settlement.<br />
            · <strong>Roulette</strong> — European roulette with SOL and $penny wager support.
          </p>
          <p>
            All casino games will be wager-able in SOL and $penny. A portion of house edge revenue from every game feeds the $penny buyback engine.
          </p>
        </section>

        {/* 5 */}
        <section className="legal-section">
          <h2>5. $penny Token Economics</h2>
          <p>
            <strong>$penny</strong> is a Solana SPL token launched on pump.fun. It is the native reward and utility token of the pennyBid ecosystem.
          </p>
          <p>
            <strong>Buyback &amp; burn:</strong> 50% of all platform bid revenue (non-refundable credits spent in auctions) is used to buy $penny on the open market and burn it permanently — reducing supply with every auction that runs.
          </p>
          <p>
            <strong>pump.fun developer rewards:</strong> $penny trades on pump.fun, generating developer fee rewards. These rewards flow directly back into the auction prize pool — meaning $penny trading activity funds real prizes for platform users.
          </p>
          <p>
            <strong>Casino integration:</strong> All casino games will accept $penny wagers alongside SOL. Casino house edge revenue adds a second buyback stream on top of auction revenue.
          </p>
          <p>
            <strong>Prize pool:</strong> $penny tokens are awarded as prizes in pennyBid auctions — creating a direct distribution mechanism to active users.
          </p>
          <p>
            The flywheel: more auctions → more bids → more buybacks → less supply → higher $penny value → more attractive prizes → more users → more auctions.
          </p>
        </section>

        {/* 6 */}
        <section className="legal-section">
          <h2>6. Token Listings & Discoverability</h2>
          <p>
            $penny is live on pump.fun and tradeable today. The listing roadmap targets all major Solana discovery and trading surfaces:
          </p>
          <p>
            <strong>DEX listings:</strong><br />
            · <strong>pump.fun</strong> — live. Primary launch and early trading venue.<br />
            · <strong>Raydium</strong> — AMM liquidity pool. Target after pump.fun graduation.<br />
            · <strong>Jupiter</strong> — the leading Solana DEX aggregator. All Jupiter-routed wallets (Phantom, Backpack, etc.) will surface $penny in swap results once listed.<br />
            · <strong>Orca</strong> — concentrated liquidity pools for deeper SOL/$penny markets.
          </p>
          <p>
            <strong>Data &amp; discovery platforms:</strong><br />
            · <strong>CoinGecko</strong> — listing application submitted post-graduation. CoinGecko listing exposes $penny to millions of researchers and traders globally.<br />
            · <strong>CoinMarketCap</strong> — parallel application. CMC listing unlocks price tracking, portfolio tools, and exchange discovery.<br />
            · <strong>Birdeye</strong> — Solana-native token analytics. $penny will appear automatically once sufficient on-chain activity is detected.<br />
            · <strong>DexScreener</strong> — already trackable. Adds trading pair charts and volume data visible to all Solana traders.
          </p>
          <p>
            <strong>Wallet integrations:</strong> Jupiter listing means $penny is discoverable and swappable directly from Phantom, Backpack, Solflare, and any Jupiter-integrated wallet without any additional integration work.
          </p>
        </section>

        {/* 7 */}
        <section className="legal-section">
          <h2>7. Solscan Verification & On-chain Transparency</h2>
          <p>
            Solscan is Solana's primary block explorer. pennyBid is committed to full on-chain transparency — every material platform transaction is publicly verifiable.
          </p>
          <p>
            <strong>Token verification on Solscan:</strong> Solscan allows token projects to submit verified metadata — project name, logo, description, website, social links, and contract audit status. A verified Solscan token page significantly increases user trust and is a prerequisite for most CEX listing applications.
          </p>
          <p>
            The $penny verification submission will include:<br />
            · Official logo and brand assets<br />
            · pennyBid platform website and whitepaper link<br />
            · X (Twitter) and Telegram community links<br />
            · Token utility description linking buyback mechanics to platform revenue<br />
            · Mint authority and freeze authority status
          </p>
          <p>
            <strong>Platform transaction transparency:</strong> Every penny.bid deposit, withdrawal, prize claim, and SOL transfer includes a Solscan link shown directly in the user's account dashboard. Users can verify any transaction independently without trusting the platform.
          </p>
          <p>
            <strong>Provably fair auction raffle:</strong> SHA-256 commitment hashes are published before each auction begins. Seeds are revealed post-draw. Anyone can reproduce the result in a browser console — no trust in the platform is required.
          </p>
        </section>

        {/* 8 */}
        <section className="legal-section">
          <h2>8. Revenue Model</h2>
          <p>
            pennyBid operates multiple revenue streams that all feed into the $penny flywheel:
          </p>
          <p>
            <strong>Bid credits (primary):</strong> Every bid costs 0.01 SOL (1 credit). Credits spent in auctions are non-refundable. This is the core revenue mechanism — similar to how a casino charges for chips. 50% goes to the $penny buyback fund; the remainder funds operations, prize procurement, and development.
          </p>
          <p>
            <strong>Auction purchase price:</strong> Winners pay the final auction price (e.g. $1.43 for a PS5 that received 143 bids) to claim their item. This is pure margin on top of bid revenue.
          </p>
          <p>
            <strong>Casino house edge:</strong> All casino games carry a built-in house edge (typically 1–5% depending on game). Every wager contributes to platform revenue and the $penny buyback pool.
          </p>
          <p>
            <strong>pump.fun developer rewards:</strong> Trading activity in $penny on pump.fun generates fee rewards that are recycled into the auction prize pool.
          </p>
        </section>

        {/* 9 */}
        <section className="legal-section">
          <h2>9. Roadmap</h2>
          <p>
            <strong>✓ Completed</strong><br />
            · Live penny auction platform at penny.bid<br />
            · Custodial Solana wallets with AES-256-GCM encryption<br />
            · SOL deposits, withdrawals, on-chain prize settlement<br />
            · Digital, physical, SOL, SPL token, and credits prize types<br />
            · Cashback raffle with provably fair draw<br />
            · $penny token launched on pump.fun<br />
            · Crash game (live on staging)<br />
            · Slots game (live on staging)<br />
            · Referral system<br />
          </p>
          <p>
            <strong>→ In Progress</strong><br />
            · Casino games launch to production<br />
            · Solscan $penny token verification<br />
            · Raydium liquidity pool<br />
            · Jupiter listing<br />
            · CoinGecko &amp; CoinMarketCap listing applications<br />
          </p>
          <p>
            <strong>◎ Upcoming</strong><br />
            · $penny wagering in all casino games<br />
            · Plinko, Mines, Dice games<br />
            · Blackjack &amp; Roulette<br />
            · $penny-denominated auction prizes increase<br />
            · CEX listing (Tier 2 targets)<br />
            · Mobile-optimised PWA<br />
            · On-chain leaderboards &amp; seasons<br />
            · DAO governance for prize pool allocation<br />
          </p>
        </section>

        {/* 10 */}
        <section className="legal-section">
          <h2>10. Community & Social</h2>
          <p>
            pennyBid is built in public. All major platform updates are announced on X (<a href="https://x.com/pennyBid_" target="_blank" rel="noreferrer">@pennyBid_</a>). The community is the primary growth engine — the referral program rewards users for bringing in new bidders, and cashback raffles ensure every participant has a chance to win regardless of auction outcome.
          </p>
          <p>
            The long-term vision is a community-governed prize pool where $penny holders vote on prize selection, game additions, and treasury allocation — turning the platform from a product into a protocol.
          </p>
          <p style={{ marginTop: 24, padding: '16px 20px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
            <strong>Disclaimer:</strong> This whitepaper is for informational purposes only and does not constitute financial advice. $penny is a utility token, not a security. Penny auctions involve financial risk — bid credits spent are non-refundable. Only participate with funds you can afford to lose. Platform features and roadmap items are subject to change.
          </p>
        </section>

      </div>
    </div>
  );
}
