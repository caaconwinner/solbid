import { useEffect, useReducer } from 'react';
import toast from 'react-hot-toast';
import { socket } from '../socket';
import { AuctionListing, AuctionState, BidEvent, BidResult, CashbackParticipant, CashbackState, CashbackWinner, SyncPayload } from '../types';

interface State {
  auction:              AuctionState | null;
  bids:                 BidEvent[];
  userCredits:          number;
  clockDrift:           number;
  isConnected:          boolean;
  bidResult:            BidResult;
  viewers:              number;
  cashback:        CashbackState;
  cashbackSettled: boolean;
  liveRetailUsd:   number | null;
}

type Action =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'SYNC';              payload: SyncPayload }
  | { type: 'BID_PLACED';        bid: BidEvent }
  | { type: 'CREDITS_UPDATE';    credits: number }
  | { type: 'OPTIMISTIC_BID' }
  | { type: 'BID_CONFIRMED' }
  | { type: 'BID_REJECTED' }
  | { type: 'AUCTION_ENDED';     winnerId: string | null; winnerName: string | null; finalPrice: number }
  | { type: 'VIEWERS_UPDATE';    viewers: number }
  | { type: 'CASHBACK_UPDATE';   participants: CashbackParticipant[] }
  | { type: 'CASHBACK_WINNER';   winner: CashbackWinner };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECTED':    return { ...state, isConnected: true };
    case 'DISCONNECTED': return { ...state, isConnected: false };

    case 'SYNC':
      return {
        ...state,
        auction:         action.payload.auction,
        userCredits:     action.payload.userCredits,
        clockDrift:      action.payload.serverTimeMs - Date.now(),
        cashback:        action.payload.cashback ?? state.cashback,
        bids:            action.payload.recentBids ?? state.bids,
        cashbackSettled: state.cashbackSettled || !!(action.payload.cashback?.settled),
        liveRetailUsd:   action.payload.liveRetailUsd ?? state.liveRetailUsd,
      };

    case 'BID_PLACED': {
      const { bid } = action;
      if (!state.auction) return state;
      return {
        ...state,
        auction: {
          ...state.auction,
          currentPrice: bid.p,
          endsAtMs:     bid.t,
          leaderId:     bid.u,
          leaderName:   bid.n,
          totalBids:    state.auction.totalBids + 1,
        },
        bids: [bid, ...state.bids].slice(0, 500),
      };
    }

    case 'AUCTION_ENDED':
      if (!state.auction) return state;
      return {
        ...state,
        auction: {
          ...state.auction,
          status:       'ended',
          leaderId:     action.winnerId,
          leaderName:   action.winnerName,
          currentPrice: action.finalPrice,
        },
      };

    case 'CREDITS_UPDATE':   return { ...state, userCredits: action.credits };
    case 'OPTIMISTIC_BID':   return { ...state, bidResult: 'optimistic', userCredits: state.userCredits - 1 };
    case 'BID_CONFIRMED':    return { ...state, bidResult: 'ok' };
    case 'BID_REJECTED':     return { ...state, bidResult: 'rejected', userCredits: state.userCredits + 1 };
    case 'VIEWERS_UPDATE':   return { ...state, viewers: action.viewers };
    case 'CASHBACK_UPDATE':  return { ...state, cashback: { ...state.cashback, participants: action.participants } };
    case 'CASHBACK_WINNER':  return { ...state, cashback: { ...state.cashback, winner: action.winner } };
    default: return state;
  }
}

function listingToState(a: AuctionListing): AuctionState {
  return { auctionId: a.auctionId, item: a.item, currentPrice: a.currentPrice,
           leaderId: null, leaderName: a.leaderName, endsAtMs: a.endsAtMs,
           status: a.status, totalBids: a.totalBids };
}

export function useAuction(auctionId: string, currentUserId: string, initialAuction?: AuctionListing) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    auction: initialAuction ? listingToState(initialAuction) : null,
    bids: [], userCredits: 0, clockDrift: 0, isConnected: false,
    bidResult: null as BidResult, viewers: initialAuction?.viewers ?? 0,
    cashback:        { participants: [], winner: null, settled: false, raffleCommitment: null } as CashbackState,
    cashbackSettled: false,
    liveRetailUsd:   null,
  }));

  useEffect(() => {
    function joinAuction() {
      dispatch({ type: 'CONNECTED' });
      socket.emit('join-auction', auctionId);
    }

    const onSync        = (payload: SyncPayload)  => dispatch({ type: 'SYNC', payload });
    const onBidPlaced   = (bid: BidEvent) => {
      dispatch({ type: 'BID_PLACED', bid });
      if (bid.u !== currentUserId) {
        toast(`${bid.n} bid — $${bid.p.toFixed(2)}`, { duration: 2000 });
      }
    };
    const onCredits     = ({ real, bonus }: { real: number; bonus: number }) => dispatch({ type: 'CREDITS_UPDATE', credits: real + bonus });
    const onConfirmed   = ()                       => dispatch({ type: 'BID_CONFIRMED' });
    const onRejected    = ({ reason }: { reason?: string } = {}) => {
      dispatch({ type: 'BID_REJECTED' });
      if (reason === 'ALREADY_LEADER') toast('You are already the winning bid!', { icon: '👑', duration: 3000 });
      else toast.error('Bid rejected');
    };
    const onEnded = ({ winnerId, winnerName, finalPrice }: { winnerId: string | null; winnerName: string | null; finalPrice: number }) => {
      dispatch({ type: 'AUCTION_ENDED', winnerId, winnerName, finalPrice });
      toast(winnerName ? `Auction ended — ${winnerName} won!` : 'Auction ended — no winner', { duration: 5000 });
    };
    const onCashbackUpdate = ({ participants }: { participants: CashbackParticipant[] }) =>
      dispatch({ type: 'CASHBACK_UPDATE', participants });
    const onCashbackWinner = (winner: CashbackWinner) => {
      dispatch({ type: 'CASHBACK_WINNER', winner });
      const name = winner.username;
      const amt  = winner.creditsRefunded ?? winner.credits_refunded ?? 0;
      // Delay toast to match spin animation duration (~4.5s)
      setTimeout(() => {
        toast(`🎰 ${name} won ${amt} credits back in the cashback raffle!`, { duration: 7000 });
      }, 4600);
    };

    socket.on('connect',          joinAuction);
    socket.on('disconnect',       () => dispatch({ type: 'DISCONNECTED' }));
    socket.on('auction-sync',     onSync);
    socket.on('bid-placed',       onBidPlaced);
    socket.on('credits-update',   onCredits);
    socket.on('bid-confirmed',    onConfirmed);
    socket.on('bid-rejected',     onRejected);
    socket.on('auction-ended',    onEnded);
    socket.on('viewers-update',   (n: number) => dispatch({ type: 'VIEWERS_UPDATE', viewers: n }));
    socket.on('cashback-update',  onCashbackUpdate);
    socket.on('cashback-winner',  onCashbackWinner);

    if (socket.connected) joinAuction();
    else socket.connect();

    return () => {
      socket.off('connect',         joinAuction);
      socket.off('disconnect');
      socket.off('auction-sync',    onSync);
      socket.off('bid-placed',      onBidPlaced);
      socket.off('credits-update',  onCredits);
      socket.off('bid-confirmed',   onConfirmed);
      socket.off('bid-rejected',    onRejected);
      socket.off('auction-ended',   onEnded);
      socket.off('cashback-update', onCashbackUpdate);
      socket.off('cashback-winner', onCashbackWinner);
      socket.emit('leave-auction',  auctionId);
      socket.disconnect();
    };
  }, [auctionId, currentUserId]);

  const placeBid = () => {
    if (!state.auction || state.userCredits < 1 || state.auction.status !== 'active') return;
    dispatch({ type: 'OPTIMISTIC_BID' });
    socket.emit('place-bid', { auctionId });
  };

  return { ...state, placeBid, liveRetailUsd: state.liveRetailUsd };
}
