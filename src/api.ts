import type { User, AuctionListing, Transaction, Win } from './types';

const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3007');

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Request failed');
  return data;
}

export const api = {
  login: (username: string, password: string) =>
    req<{ token: string; user: User }>('POST', '/api/auth/login', { username, password }),

  register: (username: string, password: string, email?: string, refCode?: string) =>
    req<{ token: string; user: User }>('POST', '/api/auth/register', { username, password, email, refCode }),

  me: (token: string) =>
    req<{ user: User }>('GET', '/api/me', undefined, token),

  auctions: (token: string) =>
    req<{ auctions: AuctionListing[] }>('GET', '/api/auctions', undefined, token),

  auctionsPublic: () =>
    req<{ auctions: AuctionListing[] }>('GET', '/api/auctions/public'),

  balance: (token: string) =>
    req<{ lamports: number; sol: number }>('GET', '/api/balance', undefined, token),

  transactions: (token: string) =>
    req<{ transactions: Transaction[] }>('GET', '/api/transactions', undefined, token),

  withdraw: (token: string, amountCredits: number, destinationAddress: string) =>
    req<{ ok: boolean; solAmount: string; remainingCredits: number; sig: string }>(
      'POST', '/api/withdraw', { amountCredits, destinationAddress }, token,
    ),

  myWins: (token: string) =>
    req<{ wins: Win[] }>('GET', '/api/my-wins', undefined, token),

  purchaseWin: (token: string, winId: string) =>
    req<{ ok: boolean; prize: Win['prize']; sig?: string }>(
      'POST', `/api/wins/${winId}/purchase`, {}, token,
    ),

  claimWin: (token: string, winId: string) =>
    req<{ ok: boolean; sig: string; amount: number }>(
      'POST', `/api/wins/${winId}/claim`, {}, token,
    ),

  forgotPassword: (email: string) =>
    req<{ ok: boolean }>('POST', '/api/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    req<{ ok: boolean }>('POST', '/api/auth/reset-password', { token, password }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    req<{ ok: boolean }>('POST', '/api/account/change-password', { currentPassword, newPassword }, token),

  updateEmail: (token: string, email: string) =>
    req<{ ok: boolean }>('POST', '/api/account/update-email', { email }, token),
};
