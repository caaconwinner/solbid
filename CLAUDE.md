# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**solBid** — a Solana-based custodial penny auction platform. Users register with username/password, get an auto-generated ed25519 custodial wallet, buy bid credits with SOL, and compete in timed penny auctions. Last bidder when the timer hits 0 wins. Bid credits are non-refundable revenue for the platform.

## Running

```bash
# Terminal 1 — backend (Express + Socket.io + SQLite)
node --env-file=.env dev-server.js

# Terminal 2 — frontend (Vite + React)
npm run dev
```

Backend on **port 3007**. Frontend on **5173** (or 5174).

```bash
npm run build   # production build
npm run lint    # ESLint
```

## Key env vars (`.env`)

| Var | Purpose |
|-----|---------|
| `SOLANA_RPC` | Mainnet/devnet RPC URL |
| `VAULT_MASTER_KEY` | 256-bit hex — encrypts all private keys |
| `ADMIN_TOKEN` | Password for `/admin` page |
| `HOUSE_WALLET` | Platform Solana address — receives bid revenue via sweep |

## Architecture

- **`dev-server.js`** — single-file Express + Socket.io server. Auth, auctions, bidding, wallet vault, deposit detection, house sweep, admin API, bots. SQLite via `better-sqlite3`.
- **`src/`** — Vite + React SPA. React Router v6. Auth in `AuthContext`. Auction state via Socket.io + `useReducer`.

### Credit / SOL economics

- 1 credit = 0.01 SOL
- New users get 5 free bid-only credits (no SOL backing → not withdrawable)
- Deposit detection: polls every 15s, credits SOL increases vs. recorded deposit total
- House sweep: same 15s loop — transfers `onchain_balance - (credits × 0.01) - fee` to `HOUSE_WALLET`
- Withdrawals: on-chain SOL transfer from user's custodial wallet, capped at `credits × 0.01 SOL`

### Critical mechanics

**Timer formula** (must never change):
```js
a.endsAtMs = Math.max(Date.now() + a.snapTimerMs, a.endsAtMs);
```
Two-phase: during long countdown bids don't move the timer; only when ≤ `snapTimerMs` does a bid reset it. `snapTimerMs` defaults to 15000ms, configurable per auction via admin.

**Clock drift correction**: Server sends `serverTimeMs` in every `auction-sync`. Client computes drift and applies in `useTimer.ts`.

**Private key security**: AES-256-GCM encrypted, scrypt-derived master key. `secretKey.fill(0)` immediately after use. `sanitizeUser()` strips `_enc` and `passwordHash` from all responses.

### Key files

| File | Role |
|------|------|
| `dev-server.js` | Everything server-side |
| `solbid.db` | SQLite — users + transactions (persists across restarts) |
| `src/hooks/useAuction.ts` | Socket state via `useReducer`; optimistic bids |
| `src/hooks/useTimer.ts` | Clock-drift-corrected countdown |
| `src/hooks/usePing.ts` | RTT via `ping-check` socket event |
| `src/context/AuthContext.tsx` | Token in localStorage |
| `src/api.ts` | All REST calls |
| `src/pages/AdminPage.tsx` | Admin UI — create/edit/delete auctions |
| `src/index.css` | All styles — dark theme, CSS vars, no CSS modules |

### Routes

| Path | Component | Auth |
|------|-----------|------|
| `/` | HomePage | user |
| `/auction/:id` | AuctionPage | user |
| `/account` | DashboardPage | user |
| `/admin` | AdminPage | admin token |
| `/login` `/register` | — | public |

### Admin API

All require `Authorization: Bearer <ADMIN_TOKEN>`:
- `GET /api/admin/auctions`
- `POST /api/admin/auction` — `{ name, image, retailValue, startAt, durationMinutes, snapTimerSeconds }`
- `PATCH /api/admin/auction/:id` — edit scheduled auction
- `DELETE /api/admin/auction/:id` — only non-active auctions

### Socket events

| Direction | Event | Payload |
|-----------|-------|---------|
| C→S | `join-auction` | auctionId |
| C→S | `place-bid` | `{ auctionId }` |
| C→S | `ping-check` | callback fn |
| S→C | `auction-sync` | `{ auction, serverTimeMs, userCredits }` |
| S→C | `bid-placed` | `{ u, n, p, t, s, ts }` |
| S→C | `bid-confirmed` / `bid-rejected` | — / `{ reason }` |
| S→C | `credits-update` | number |
| S→C | `auction-ended` | `{ winnerId, winnerName, finalPrice }` |

### Remaining production gaps

- `POST /api/internal/sign` — stub, not wired to real signing
- Multi-node scaling — needs `socket.io-redis` adapter
