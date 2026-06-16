import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../lib/config';

let socket: Socket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(API_URL || undefined, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });
    }    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => {
      socket?.off('connect');
      socket?.off('disconnect');
    };
  }, []);

  const joinVenue = useCallback((venueId: string) => {
    socket?.emit('join:venue', venueId);
  }, []);

  const joinOrder = useCallback((orderId: string) => {
    socket?.emit('join:order', orderId);
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socket?.on(event, handler);
    return () => { socket?.off(event, handler); };
  }, []);

  return { connected, joinVenue, joinOrder, on, socket };
}
