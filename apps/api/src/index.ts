import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pool } from './db.js';
import { redis } from './redis.js';
import { sessionRoutes } from './routes/sessions.js';
import { menuRoutes } from './routes/menu.js';
import { orderRoutes } from './routes/orders.js';
import { staffRoutes } from './routes/staff.js';
import { securityRoutes } from './routes/security.js';
import { analyticsRoutes } from './routes/analytics.js';
import { startPatternMonitor } from './services/pattern-monitor.js';
import { initSocket, getIo } from './socket.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.API_PORT) || 3001;
const HOST = process.env.API_HOST || '0.0.0.0';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await app.register(sessionRoutes, { prefix: '/api' });
  await app.register(menuRoutes, { prefix: '/api' });
  await app.register(orderRoutes, { prefix: '/api' });
  await app.register(staffRoutes, { prefix: '/api/staff' });
  await app.register(securityRoutes, { prefix: '/api/staff' });
  await app.register(analyticsRoutes, { prefix: '/api/staff' });

  await app.listen({ port: PORT, host: HOST });

  const io = initSocket(app.server);
  startPatternMonitor(io);

  const shutdown = async () => {
    getIo().close();
    await app.close();
    await pool.end();
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`TableOrder API running on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
