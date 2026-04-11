export function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: April 2025</p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using pennyBid ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
        </section>

        <section className="legal-section">
          <h2>2. Nature of Penny Auctions</h2>
          <p>pennyBid operates penny auctions. Each bid costs one credit (equivalent to 0.01 SOL). Every bid raises the auction price by $0.01 and may reset the countdown timer. Placing a bid does not guarantee winning the auction.</p>
          <p><strong>Bid credits spent in auctions are non-refundable.</strong> Unspent credits retain their SOL value and may be withdrawn at any time.</p>
          <p>Penny auctions involve financial risk. You may spend credits without winning an item. Only participate with funds you can afford to lose.</p>
        </section>

        <section className="legal-section">
          <h2>3. Eligibility</h2>
          <p>You must be at least 18 years old to use the Platform. By registering, you confirm that you meet this requirement and that participation in penny auctions is legal in your jurisdiction. It is your responsibility to verify local laws before participating.</p>
        </section>

        <section className="legal-section">
          <h2>4. Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. All activity under your account is your responsibility. pennyBid reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or attempt to manipulate auctions.</p>
        </section>

        <section className="legal-section">
          <h2>5. Custodial Wallets</h2>
          <p>pennyBid generates a Solana wallet on your behalf ("custodial wallet") to facilitate deposits and withdrawals. Your private key is encrypted and stored securely. pennyBid does not share or misuse your key. You may withdraw your SOL balance at any time, subject to network fees.</p>
          <p>pennyBid is not a bank or financial institution. Deposited funds are not insured.</p>
        </section>

        <section className="legal-section">
          <h2>6. Cashback Raffle</h2>
          <p>At the end of every auction, one randomly selected bidder wins bonus credits equal to their bid count. The draw uses a provably fair system — the random seed is committed (via SHA-256 hash) before the auction begins and revealed after the draw. Results are independently verifiable.</p>
          <p>Bonus credits awarded through the raffle are non-refundable and can only be used for bidding.</p>
        </section>

        <section className="legal-section">
          <h2>7. $penny Token</h2>
          <p>$penny is a Solana SPL token. It is not a security, investment product, or financial instrument. Holding $penny does not entitle you to any ownership stake in pennyBid. Token value may go to zero. Do not purchase $penny with funds you cannot afford to lose.</p>
        </section>

        <section className="legal-section">
          <h2>8. Prohibited Conduct</h2>
          <p>You may not: use bots or automated scripts to place bids; collude with other users to manipulate auction outcomes; attempt to exploit platform bugs; use the Platform for money laundering or other illegal activity; create multiple accounts to abuse referral or bonus systems.</p>
        </section>

        <section className="legal-section">
          <h2>9. Limitation of Liability</h2>
          <p>pennyBid is provided "as is". We are not liable for any losses arising from auction outcomes, network outages, Solana blockchain issues, smart contract failures, or any other cause. Your use of the Platform is at your own risk.</p>
        </section>

        <section className="legal-section">
          <h2>10. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated terms.</p>
        </section>

        <section className="legal-section">
          <h2>11. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:support@penny.bid">support@penny.bid</a>.</p>
        </section>
      </div>
    </div>
  );
}
