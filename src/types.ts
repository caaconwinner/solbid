export interface AuctionItem {
  name: string;
  image: string;
  retailValue: number;
}

export interface AuctionState {
  auctionId: string;
  item: AuctionItem;
  currentPrice: number;
  leaderId: string | null;
  leaderName: string | null;
  endsAtMs:   number;
  startsAtMs?: number;
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'settled';
  totalBids: number;
  prizeMint?: string | null;
}

// Tiny WebSocket payload — every byte matters at 10hz broadcast rate
export interface BidEvent {
  u: string;   // userId
  n: string;   // display name
  p: number;   // new price (USD)
  t: number;   // new endsAtMs
  s: number;   // sequence number
  ts: number;  // server timestamp ms
}

export interface CashbackParticipant {
  id: string;
  username: string;
  total_bids: number;
  real_bids: number;
}

export interface CashbackWinner {
  userId?: string;
  user_id?: string;
  username: string;
  creditsRefunded?: number;
  credits_refunded?: number;
  // provably fair proof (present after draw)
  raffleSeed?:           string | null;
  raffleCommitment?:     string | null;
  drawHash?:             string | null;
  participantsSnapshot?: string | null;
}

export interface CashbackState {
  participants:      CashbackParticipant[];
  winner:            CashbackWinner | null;
  settled:           boolean;
  raffleCommitment:  string | null; // sha256(seed) — published before draw
}

export interface RaffleProof {
  raffleSeed:           string;
  raffleCommitment:     string;
  drawHash:             string;
  participantsSnapshot: string;
}

export interface SyncPayload {
  auction: AuctionState;
  serverTimeMs: number;
  userCredits: number;
  recentBids?: BidEvent[];
  cashback?: CashbackState;
  liveRetailUsd?: number | null;  // live token price × amount, null if unavailable
}

export type BidResult = 'ok' | 'rejected' | 'optimistic' | null;

export interface User {
  id: string;
  username: string;
  email: string | null;   // optional — only set if user provided it for password recovery
  depositAddress: string;
  credits: number;
  bonusCredits: number;
  refCode: string | null;
}

export interface Transaction {
  id: string;
  type: 'bid' | 'deposit' | 'withdraw';
  item?: string;
  auctionId?: string;
  credits: number;   // negative = spent/withdrawn, positive = received
  sol?: number;
  sig?: string;
  ts: number;
}

export interface Win {
  id:            string;
  auctionId:     string;
  itemName:      string;
  itemImage:     string | null;
  prize:         { type: 'sol'; amount: number }
               | { type: 'digital'; code: string }
               | { type: 'physical'; description: string }
               | { type: 'credits'; amount: number }
               | { type: 'token'; mint: string; amount: number };
  finalPrice:    number;
  purchasePrice: number;
  purchased:     boolean;
  purchaseSig:   string | null;
  ts:            number;
}

export interface AuctionListing {
  auctionId: string;
  item: AuctionItem;
  currentPrice: number;
  endsAtMs: number;
  startsAtMs?: number;
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'settled';
  totalBids: number;
  leaderName: string | null;
  viewers?: number;
  liveRetailUsd?: number | null;
  prizeMint?: string | null;
}
