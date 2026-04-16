import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">

        {/* Brand column */}
        <div className="footer-brand">
          <div className="footer-logo">penny<strong>Bid</strong></div>
          <div className="footer-tagline">Penny auctions powered by Solana</div>
          <div className="footer-solana">
            {/* Solana gradient diamond */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="sol-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9945FF"/>
                  <stop offset="100%" stopColor="#14F195"/>
                </linearGradient>
              </defs>
              <path d="M4 17h13.5l2.5-2.5H6.5L4 17zm0-5h13.5l2.5-2.5H6.5L4 12zm2.5-5H20l-2.5-2.5H4L6.5 7z" fill="url(#sol-grad)"/>
            </svg>
            Built on Solana
          </div>
        </div>

        {/* Nav column */}
        <div className="footer-col">
          <div className="footer-col-title">Platform</div>
          <Link to="/auctions"     className="footer-link">Auctions</Link>
          <Link to="/how-it-works" className="footer-link">How it works</Link>
          <Link to="/faq"          className="footer-link">FAQ</Link>
          <Link to="/penny"        className="footer-link">$penny token</Link>
          <Link to="/refer"        className="footer-link">Refer a friend</Link>
          <Link to="/brand"        className="footer-link">Brand</Link>
        </div>

        {/* Account column */}
        <div className="footer-col">
          <div className="footer-col-title">Account</div>
          <Link to="/register" className="footer-link">Create account</Link>
          <Link to="/login"    className="footer-link">Login</Link>
          <Link to="/account"  className="footer-link">Dashboard</Link>
        </div>

        {/* Legal + social column */}
        <div className="footer-col">
          <div className="footer-col-title">Legal</div>
          <Link to="/terms"       className="footer-link">Terms of Service</Link>
          <Link to="/privacy"     className="footer-link">Privacy Policy</Link>
          <Link to="/whitepaper"  className="footer-link" style={{ color: 'var(--orange)' }}>Whitepaper</Link>
          <div className="footer-col-title" style={{ marginTop: 20 }}>Community</div>
          <a
            href="https://x.com/pennyBid_"
            target="_blank"
            rel="noreferrer"
            className="footer-link footer-link--social"
            title="Follow @pennyBid_ on X"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Follow on X
          </a>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} pennyBid. All rights reserved.</span>
        <span className="footer-disclaimer">
          Penny auctions involve risk. Bid credits spent in auctions are non-refundable. Participate responsibly.
        </span>
      </div>
    </footer>
  );
}
