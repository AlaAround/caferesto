import { Redis } from 'ioredis';

/**
 * Normalise REDIS_URL — users often paste the full Upstash CLI command by mistake.
 * Valid:   rediss://default:TOKEN@host.upstash.io:6379
 * Invalid: redis-cli --tls -u rediss://default:TOKEN@host.upstash.io:6379
 */
export function resolveRedisUrl(raw?: string): string {
  if (!raw?.trim()) return 'redis://localhost:6379';

  let url = raw.trim().replace(/^["']|["']$/g, '');

  // Extract embedded redis(s):// URL from a pasted CLI command
  const match = url.match(/(rediss?:\/\/[^\s'"`]+)/i);
  if (match) url = match[1];

  try {
    new URL(url);
  } catch {
    throw new Error(
      'Invalid REDIS_URL. Paste ONLY the Upstash connection string, for example:\n' +
        '  rediss://default:YOUR_TOKEN@your-db.upstash.io:6379\n' +
        'Do NOT include "redis-cli --tls -u" in the value.'
    );
  }

  return url;
}

const redisUrl = resolveRedisUrl(process.env.REDIS_URL);

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
});

export const REDIS_KEYS = {
  usedToken: (jti: string) => `token:used:${jti}`,
  sessionMeta: (jti: string) => `session:${jti}`,
  ipScans: (ip: string) => `scans:ip:${ip}`,
  deviceLocations: (fingerprint: string) => `device:locations:${fingerprint}`,
  tableScans: (tableId: string) => `scans:table:${tableId}`,
} as const;

export async function markTokenUsed(jti: string, ttlSeconds: number): Promise<void> {
  await redis.set(REDIS_KEYS.usedToken(jti), '1', 'EX', ttlSeconds);
}

export async function isTokenUsed(jti: string): Promise<boolean> {
  const result = await redis.get(REDIS_KEYS.usedToken(jti));
  return result !== null;
}

export async function storeSessionMeta(
  jti: string,
  meta: Record<string, string>,
  ttlSeconds: number
): Promise<void> {
  await redis.hset(REDIS_KEYS.sessionMeta(jti), meta);
  await redis.expire(REDIS_KEYS.sessionMeta(jti), ttlSeconds);
}

export async function getSessionMeta(jti: string): Promise<Record<string, string> | null> {
  const data = await redis.hgetall(REDIS_KEYS.sessionMeta(jti));
  return Object.keys(data).length > 0 ? data : null;
}

export async function trackIpScan(ip: string, ttlSeconds = 3600): Promise<number> {
  const key = REDIS_KEYS.ipScans(ip);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, ttlSeconds);
  return count;
}

export async function trackDeviceLocation(
  fingerprint: string,
  lat: number,
  lon: number,
  windowSeconds = 60
): Promise<number> {
  const key = REDIS_KEYS.deviceLocations(fingerprint);
  const entry = `${lat},${lon},${Date.now()}`;
  await redis.lpush(key, entry);
  await redis.ltrim(key, 0, 49);
  await redis.expire(key, windowSeconds);
  return redis.llen(key);
}

export async function trackTableScan(tableId: string, windowSeconds = 60): Promise<number> {
  const key = REDIS_KEYS.tableScans(tableId);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return count;
}
