import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3007');
export const socket = io(WS_URL, {
  autoConnect: false,
  transports: ['websocket'],
  auth: { token: localStorage.getItem('token') ?? '' },
});

export function updateSocketAuth(token: string) {
  (socket.auth as { token: string }).token = token;
}
