import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
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
