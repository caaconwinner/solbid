# pennyBid — Pre-Launch Checklist

Everything that must be done before going live with the token and the website.

---

## 1. Wallets — replace ALL test wallets

These are the most critical changes. Every wallet below should be a freshly generated production keypair, never used for testing.

### HOUSE_WALLET
Receives all bid revenue (swept automatically every 15s from user deposit wallets).
- [ ] Generate a new Solana wallet (cold storage recommended — Ledger or paper)
- [ ] Update `HOUSE_WALLET=<new pubkey>` in `/root/solbid/.env` on the server
- [ ] Verify sweep works after restart: deposit SOL → bid → check house wallet receives funds

### PRIZE_WALLET
Sends SOL prizes to auction winners. Must stay funded.
- [ ] Generate a new keypair: `solana-keygen new --outfile prize-wallet.json`
- [ ] Fund it with enough SOL to cover expected prize payouts (top it up regularly)
- [ ] Update `PRIZE_WALLET_SECRET=<hex-encoded 64-byte secret>` in `.env`
- [ ] Back up the keypair securely offline — if lost, you cannot send prizes
- [ ] Verify: run a test auction end-to-end and claim the prize

### VAULT_MASTER_KEY
AES-256-GCM key that encrypts every user's private key in the database.
- [ ] **Critical**: if you change this after users have deposited, all their encrypted wallets become unreadable and they lose their SOL
- [ ] For a clean launch (no real users yet): generate a new 256-bit hex key and set it in `.env`
- [ ] Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Back up offline — losing this key means losing all user funds permanently
- [ ] Never commit it to git. Confirm `.env` is in `.gitignore`

---

## 2. $penny Token

- [ ] Confirm the `$penny` mint address on pump.fun
- [ ] Confirm the pump.fun developer rewards address is set to the correct wallet (the one you control)
- [ ] If implementing `$penny` deposits in future: create the platform ATA and note the address
- [ ] Update the token contract address anywhere it appears on the site (currently the site links to pump.fun but doesn't hardcode an address — add it to the $penny page)

---

## 3. Environment Variables — full audit

SSH into the server and verify every variable in `/root/solbid/.env`:

```
SOLANA_RPC=          # ← Must be a private RPC (see section 4)
VAULT_MASTER_KEY=    # ← Fresh production key (see section 1)
ADMIN_TOKEN=         # ← Change from any test value to a strong random string
HOUSE_WALLET=        # ← Fresh production wallet (see section 1)
PRIZE_WALLET_SECRET= # ← Fresh production wallet (see section 1)
FRONTEND_URL=https://penny.bid
RESEND_API_KEY=      # ← Live Resend key (not test key)
RESEND_FROM=         # ← e.g. noreply@penny.bid — domain must be verified in Resend
```

After any `.env` change: `pm2 restart solbid`

---

## 4. RPC Endpoint

The default `https://api.mainnet-beta.solana.com` is a public endpoint — it will rate-limit you under real traffic.

- [ ] Sign up for a private RPC: Helius, QuickNode, or Alchemy (Helius has a generous free tier)
- [ ] Update `SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=<your-key>` in `.env`
- [ ] Test deposit detection still works after switching

---

## 5. Email (Resend)

- [ ] Verify `penny.bid` domain in Resend dashboard (add DNS TXT + MX records)
- [ ] Switch from test API key to live API key
- [ ] Set `RESEND_FROM=noreply@penny.bid` (or similar)
- [ ] Test password reset email end-to-end
- [ ] Test deposit confirmation email

---

## 6. Admin Token

- [ ] Change `ADMIN_TOKEN` to a long random string — this is the only protection on `/admin`
- [ ] Generate: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
- [ ] Do not share it. Do not put it in the frontend code.

---

## 7. Server Hardening

- [ ] PM2 auto-restart on reboot: `pm2 startup` → run the printed command → `pm2 save`
- [ ] Set up regular SQLite backups: `solbid.db` is the entire database — one corrupted file = everything gone
  - Simple option: daily `cp /root/solbid/solbid.db /root/backups/solbid-$(date +%Y%m%d).db`
  - Better: sync to S3/Backblaze with `rclone`
- [ ] Check disk space on the VPS — SQLite will grow over time
- [ ] Check Hetzner firewall: only ports 80, 443, and 22 should be open

---

## 8. End-to-End Test (before announcing)

Run through the full user journey on production:

- [ ] Register a new account via referral link — confirm referred_by is recorded
- [ ] Deposit SOL (small amount) — confirm credits appear within 15s
- [ ] Place a bid on a live auction
- [ ] Win an auction — confirm winner is recorded
- [ ] Claim SOL prize — confirm transaction goes through from prize wallet
- [ ] Withdraw SOL — confirm it arrives at the destination wallet
- [ ] Password reset — confirm email arrives and reset works
- [ ] Sign out and sign back in — confirm session persists after `pm2 restart solbid`
- [ ] Test referral: sign up with a ref link, deposit ≥ 0.05 SOL — confirm both users get bonus credits

---

## 9. Frontend Checks

- [ ] Confirm `penny.bid` SSL cert is valid and auto-renews (Caddy handles this automatically)
- [ ] Check the Brand page at `penny.bid/brand` — logo SVGs download correctly
- [ ] Check the $penny page at `penny.bid/penny` — add real token contract address once confirmed
- [ ] Test on mobile — the login page 3-card layout should stack vertically on small screens (add responsive CSS if not already done)
- [ ] Remove or hide the X (Twitter) link in the header until the account is set up

---

## 10. After Launch

- [ ] Monitor `pm2 logs solbid` for the first few hours
- [ ] Watch for deposit detection errors (RPC issues show up here)
- [ ] Keep the prize wallet topped up — set a minimum balance reminder
- [ ] Set up uptime monitoring (UptimeRobot free tier pings the URL and emails you if it goes down)
