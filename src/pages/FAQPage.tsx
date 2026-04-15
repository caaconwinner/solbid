import { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    category: 'Credits & SOL',
    items: [
      { q: 'Are credits refundable?', a: 'Credits used to bid are not refundable — that\'s how the auction model works. Unspent credits always retain their SOL value and can be withdrawn at any time.' },
      { q: 'What happens to my SOL after I bid?', a: 'Your credits decrease by 1 per bid. The SOL backing those credits is swept to the platform. Only unspent credits retain SOL value — those are always withdrawable.' },
      { q: 'How do I deposit SOL?', a: 'Go to your Account page and copy your deposit address. Send any amount of SOL to it from any wallet. Credits appear automatically within 15 seconds.' },
      { q: 'How do I withdraw?', a: 'Go to Account → Credits tab and enter a Solana address to withdraw to. You can withdraw the full SOL value of your unspent credits at any time.' },
    ],
  },
  {
    category: 'How auctions work',
    items: [
      { q: 'How is the auction price so low?', a: 'The price only goes up $0.01 per bid — so even 300 bids means the price is only $3.00. Winners get high-value items for a tiny fraction of retail.' },
      { q: 'What is snap-mode?', a: 'When the countdown reaches 15 seconds or below, the auction enters snap-mode. Any new bid resets the timer back to 15 seconds. During the long countdown phase, bids don\'t move the timer at all.' },
      { q: 'Can I get sniped at the last second?', a: 'Yes — that\'s the game. Snap-mode means the auction can\'t end until 15 full seconds pass with zero bids. Watch the bid feed and time your bids carefully.' },
      { q: 'Who wins the auction?', a: 'The last person to place a bid before the timer hits zero wins. They then have the option to purchase the item at the final auction price.' },
      { q: 'What does the winner pay?', a: 'Winners pay the final auction price in SOL (e.g. $1.43 for a PS5 if 143 bids were placed). This is separate from any credits they spent bidding.' },
    ],
  },
  {
    category: 'Wallet & security',
    items: [
      { q: 'Is my wallet safe?', a: 'Your deposit wallet is custodial — we generate and hold the key on your behalf. It is encrypted with AES-256-GCM using a server-side master key. Only withdrawal and sweep operations ever sign a transaction with your key.' },
      { q: 'Can pennyBid access my personal wallet?', a: 'No. Your personal Solana wallet (Phantom, Backpack, etc.) is never connected to the platform. You simply send SOL from it to your deposit address — we never touch your main wallet.' },
      { q: 'What if I lose access to my account?', a: 'Use the password reset flow on the login page. Your SOL is tied to your account, not a seed phrase, so as long as you can reset your password you can access your funds.' },
    ],
  },
  {
    category: 'Cashback raffle',
    items: [
      { q: 'What is the cashback raffle?', a: 'At the end of every auction, one random bidder (excluding the auction winner) wins back bonus credits equal to their total bid count. You are entered automatically just by bidding — no extra steps.' },
      { q: 'Are cashback credits withdrawable?', a: 'No — cashback bonus credits are bid-only. They can be used to place bids but cannot be withdrawn as SOL.' },
      { q: 'How do I know the raffle is fair?', a: 'The draw is provably fair. Before each auction starts, we publish a SHA-256 hash of a random seed (the commitment). After the draw, we reveal the seed. Anyone can verify the result using a browser console. See the How It Works page for full details.' },
    ],
  },
  {
    category: 'Prizes',
    items: [
      { q: 'What types of prizes can I win?', a: 'pennyBid auctions can feature four types of prizes: physical items (e.g. PS5, iPhone — shipped to you), SOL sent directly to your wallet, bid credits added to your account balance, and SPL tokens (e.g. $penny) sent to your deposit address.' },
      { q: 'How do I receive a physical prize?', a: 'After winning, go to Account → Wins and click "Claim Prize". You\'ll be asked to pay the final auction price in SOL, then provide a shipping address. The team will fulfil and ship your item.' },
      { q: 'How do I receive a SOL prize?', a: 'SOL prizes are sent directly on-chain to your pennyBid deposit wallet. You can then withdraw that SOL at any time from your Account page.' },
      { q: 'How do I receive an SPL token prize?', a: 'SPL token prizes (such as $penny) are sent to the associated token account of your deposit address on Solana. They arrive on-chain automatically — no claim step needed.' },
      { q: 'How do I receive a credits prize?', a: 'Credits prizes are added directly to your account balance the moment the admin sends them. They appear instantly in your header credits count and Account page.' },
      { q: 'Is there a time limit to claim my prize?', a: 'Yes — unclaimed prizes may expire. Claim your prize as soon as possible from Account → Wins to avoid forfeiture.' },
    ],
  },
  {
    category: '$penny token',
    items: [
      { q: 'What is $penny?', a: '$penny is the native Solana SPL token of the pennyBid platform, launched on pump.fun. It powers the reward mechanics and buyback engine.' },
      { q: 'Do I need $penny to bid?', a: 'No. You can bid using regular SOL credits. $penny is an optional part of the ecosystem.' },
      { q: 'How does $penny benefit from the platform?', a: '50% of all platform bid revenue is used to buy $penny on the open market and burn it permanently. pump.fun developer rewards from $penny trading also flow into the auction prize pool.' },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item" data-open={open}>
      <button className="faq-q" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <svg className="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

export function FAQPage() {
  return (
    <div className="faq-page">
      <div className="faq-hero">
        <h1 className="faq-title">Frequently asked questions</h1>
        <p className="faq-sub">Everything you need to know about pennyBid. Can't find your answer? <a href="mailto:support@penny.bid">Contact us</a>.</p>
      </div>

      <div className="faq-container">
        {FAQS.map(section => (
          <div key={section.category} className="faq-section">
            <h2 className="faq-section-title">{section.category}</h2>
            <div className="faq-list">
              {section.items.map(item => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        <div className="faq-cta">
          <Link to="/how-it-works" className="btn-outline">How it works →</Link>
          <Link to="/register"     className="btn-outline">Create account &amp; start bidding</Link>
        </div>
      </div>
    </div>
  );
}
