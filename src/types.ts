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
  endsAtMs: number;
  status: 'scheduled' | 'active' | 'ended' | 'settled';
  totalBids: number;
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

export interface SyncPayload {
  auction: AuctionState;
  serverTimeMs: number;
  userCredits: number;
}

export type BidResult = 'ok' | 'rejected' | 'optimistic' | null;

export interface User {
  id: string;
  username: string;
  email: string | null;   // optional — only set if user provided it for password recovery
  depositAddress: string;
  credits: number;
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
  prize:         { type: 'sol'; amount: number }
               | { type: 'digital'; code: string }
               | { type: 'physical'; description: string };
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
  status: 'scheduled' | 'active' | 'ended' | 'settled';
  totalBids: number;
  leaderName: string | null;
  viewers?: number;
}
