import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' },
  });

  io.on('connection', (socket) => {
    socket.on('join:venue', (venueId: string) => {
      socket.join(`venue:${venueId}`);
    });
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
