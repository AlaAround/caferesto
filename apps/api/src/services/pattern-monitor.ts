import type { Server } from 'socket.io';
import { query } from '../db.js';
import { redis, REDIS_KEYS } from '../redis.js';
import { createSecurityAlert } from './security-alerts.js';

const INTERVAL_MS = Number(process.env.PATTERN_MONITOR_INTERVAL_MS) || 30000;
const MAX_SCANS_PER_IP = 20;
const MAX_LOCATIONS_PER_DEVICE = 5;
const MAX_SCANS_PER_TABLE = 15;

export function startPatternMonitor(io: Server): void {
  setInterval(async () => {
    try {
      await runPatternChecks(io);
    } catch (err) {
      console.error('[pattern-monitor] Error:', err);
    }
  }, INTERVAL_MS);

  console.log(`[pattern-monitor] Started (interval: ${INTERVAL_MS}ms)`);
}

async function runPatternChecks(io: Server): Promise<void> {
  const { rows: venues } = await query<{ id: string }>(
    'SELECT id FROM venues WHERE is_active = true'
  );

  for (const venue of venues) {
    await checkPendingSessions(venue.id, io);
  }
}

async function checkPendingSessions(venueId: string, io: Server): Promise<void> {
  const keys = await redis.keys('scans:ip:*');
  for (const key of keys) {
    const ip = key.replace('scans:ip:', '');
    const scanCount = await redis.get(key);

    if (scanCount && Number(scanCount) > MAX_SCANS_PER_IP) {
      const existing = await query(
        `SELECT id FROM security_alerts
         WHERE venue_id = $1 AND alert_type = 'high_scan_volume_ip'
           AND metadata->>'ip' = $2 AND created_at > now() - interval '1 hour'`,
        [venueId, ip]
      );
      if (existing.rows.length === 0) {
        const alertId = await createSecurityAlert({
          venueId,
          alertType: 'high_scan_volume_ip',
          severity: 'high',
          description: `${scanCount} scan attempts from IP ${ip} within the last hour`,
          metadata: { ip, scanCount: Number(scanCount) },
        });
        io.to(`venue:${venueId}`).emit('security:alert', { id: alertId });
      }
    }
  }

  const deviceKeys = await redis.keys('device:locations:*');
  for (const key of deviceKeys) {
    const fingerprint = key.replace('device:locations:', '');
    const locations = await redis.lrange(key, 0, -1);
    const uniqueCoords = new Set(
      locations.map((l: string) => {
        const [lat, lon] = l.split(',');
        return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
      })
    );

    if (uniqueCoords.size > MAX_LOCATIONS_PER_DEVICE) {
      const existing = await query(
        `SELECT id FROM security_alerts
         WHERE venue_id = $1 AND alert_type = 'multi_location_device'
           AND metadata->>'fingerprint' = $2 AND created_at > now() - interval '1 hour'`,
        [venueId, fingerprint]
      );
      if (existing.rows.length === 0) {
        const alertId = await createSecurityAlert({
          venueId,
          alertType: 'multi_location_device',
          severity: 'critical',
          description: `Device attempted orders from ${uniqueCoords.size} different GPS positions`,
          metadata: { fingerprint, locationCount: uniqueCoords.size },
        });
        io.to(`venue:${venueId}`).emit('security:alert', { id: alertId });
      }
    }
  }
}

export async function trackScanPatterns(params: {
  venueId: string;
  tableId: string;
  ip: string;
  fingerprint?: string;
  latitude: number;
  longitude: number;
}): Promise<void> {
  await redis.incr(REDIS_KEYS.ipScans(params.ip));
  await redis.expire(REDIS_KEYS.ipScans(params.ip), 3600);

  const tableCount = await redis.incr(REDIS_KEYS.tableScans(params.tableId));
  await redis.expire(REDIS_KEYS.tableScans(params.tableId), 60);

  if (params.fingerprint) {
    await redis.lpush(
      REDIS_KEYS.deviceLocations(params.fingerprint),
      `${params.latitude},${params.longitude},${Date.now()}`
    );
    await redis.ltrim(REDIS_KEYS.deviceLocations(params.fingerprint), 0, 49);
    await redis.expire(REDIS_KEYS.deviceLocations(params.fingerprint), 60);
  }

  if (tableCount > MAX_SCANS_PER_TABLE) {
    await createSecurityAlert({
      venueId: params.venueId,
      alertType: 'suspicious_pattern',
      severity: 'medium',
      description: `${tableCount} scan attempts on table within 60 seconds`,
      metadata: { tableId: params.tableId, scanCount: tableCount },
    });
  }
}
