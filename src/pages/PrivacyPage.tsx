export function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: April 2025</p>

        <section className="legal-section">
          <h2>1. Information We Collect</h2>
          <p>When you register, we collect your username, email address, and a hashed password. We do not collect your real name, phone number, or payment card details.</p>
          <p>We also record auction activity (bids placed, auctions won), credit balances, deposit and withdrawal history, and referral relationships.</p>
          <p>Your Solana deposit address is generated automatically and stored alongside an AES-256-GCM encrypted private key. The encryption key never leaves our server.</p>
        </section>

        <section className="legal-section">
          <h2>2. How We Use Your Information</h2>
          <p>We use your information to: operate your account and process bids; detect deposits and process withdrawals; send transactional emails (deposit confirmations, password resets, win notifications); prevent fraud and enforce our Terms of Service; and improve the Platform.</p>
          <p>We do not sell your personal data to third parties.</p>
        </section>

        <section className="legal-section">
          <h2>3. Email Communications</h2>
          <p>We send transactional emails only — deposit confirmations, password resets, and win notifications. We do not send marketing emails without your consent. Email delivery is handled by Resend (resend.com).</p>
        </section>

        <section className="legal-section">
          <h2>4. Blockchain Data</h2>
          <p>Solana is a public blockchain. Deposit addresses and on-chain transactions are publicly visible. We do not control what third parties can observe on-chain.</p>
        </section>

        <section className="legal-section">
          <h2>5. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. If you request account deletion, we will remove your personal data within 30 days, subject to legal obligations to retain transaction records.</p>
        </section>

        <section className="legal-section">
          <h2>6. Security</h2>
          <p>Private keys are encrypted with AES-256-GCM using a server-side master key. Passwords are hashed and never stored in plaintext. We use HTTPS for all communications. No security measure is perfect — use a unique password for your pennyBid account.</p>
        </section>

        <section className="legal-section">
          <h2>7. Cookies and Local Storage</h2>
          <p>We use browser localStorage to store your session token and UI preferences (e.g. dark/light theme). We do not use third-party tracking cookies or analytics services.</p>
        </section>

        <section className="legal-section">
          <h2>8. Your Rights</h2>
          <p>You may request a copy of your personal data, correction of inaccurate data, or deletion of your account at any time by contacting us. We will respond within 30 days.</p>
        </section>

        <section className="legal-section">
          <h2>9. Changes to This Policy</h2>
          <p>We may update this policy as the Platform evolves. Material changes will be communicated via email to registered users.</p>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>Privacy questions or data requests: <a href="mailto:support@penny.bid">support@penny.bid</a>.</p>
        </section>
      </div>
    </div>
  );
}
