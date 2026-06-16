import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { signSessionToken, getTokenTtlSeconds } from '../services/token.js';
import { storeSessionMeta } from '../redis.js';
import { logGpsDenied } from '../services/security-alerts.js';
import { trackScanPatterns } from '../services/pattern-monitor.js';

interface StartSessionBody {
  latitude: number;
  longitude: number;
  accuracy?: number;
  deviceFingerprint?: string;
  gpsDenied?: boolean;
}

export async function sessionRoutes(app: FastifyInstance) {
  // Gate 1 + 2: GPS capture → signed token issuance
  app.post<{ Params: { venueSlug: string; tableNumber: string }; Body: StartSessionBody }>(
    '/venues/:venueSlug/tables/:tableNumber/session',
    async (request, reply) => {
      const { venueSlug, tableNumber } = request.params;
      const body = request.body;
      const ip = request.ip;
      const userAgent = request.headers['user-agent'];

      const { rows: venueRows } = await query<{ id: string; name: string }>(
        'SELECT id, name FROM venues WHERE slug = $1 AND is_active = true',
        [venueSlug]
      );
      if (venueRows.length === 0) {
        return reply.status(404).send({ error: 'Venue not found' });
      }
      const venue = venueRows[0];

      const { rows: tableRows } = await query<{ id: string; table_number: number; label: string | null }>(
        'SELECT id, table_number, label FROM venue_tables WHERE venue_id = $1 AND table_number = $2 AND is_active = true',
        [venue.id, Number(tableNumber)]
      );
      if (tableRows.length === 0) {
        return reply.status(404).send({ error: 'Table not found' });
      }
      const table = tableRows[0];

      // Gate 1: GPS denied → block immediately
      if (body.gpsDenied || body.latitude === undefined || body.longitude === undefined) {
        await logGpsDenied({
          venueId: venue.id,
          tableId: table.id,
          ipAddress: ip,
          userAgent,
        });
        return reply.status(403).send({
          error: 'GPS_REQUIRED',
          message: 'Location permission is required to order at this venue.',
        });
      }

      // Gate 2: Issue short-lived signed token
      const { token, jti, expiresAt } = await signSessionToken({
        venueId: venue.id,
        tableId: table.id,
        latitude: body.latitude,
        longitude: body.longitude,
      });

      const ttl = getTokenTtlSeconds(Math.floor(expiresAt.getTime() / 1000));

      await query(
        `INSERT INTO order_sessions
         (venue_id, table_id, scan_latitude, scan_longitude, scan_accuracy,
          device_fingerprint, ip_address, user_agent, token_jti, token_issued_at, token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10)`,
        [
          venue.id,
          table.id,
          body.latitude,
          body.longitude,
          body.accuracy ?? null,
          body.deviceFingerprint ?? null,
          ip,
          userAgent ?? null,
          jti,
          expiresAt,
        ]
      );

      await storeSessionMeta(jti, {
        venueId: venue.id,
        tableId: table.id,
        ip,
      }, ttl);

      // Gate 4: Track patterns from scan time
      await trackScanPatterns({
        venueId: venue.id,
        tableId: table.id,
        ip,
        fingerprint: body.deviceFingerprint,
        latitude: body.latitude,
        longitude: body.longitude,
      });

      return {
        token,
        expiresAt: expiresAt.toISOString(),
        venue: { id: venue.id, name: venue.name, slug: venueSlug },
        table: { id: table.id, number: table.table_number, label: table.label },
      };
    }
  );

  app.get<{ Params: { venueSlug: string } }>(
    '/venues/:venueSlug',
    async (request, reply) => {
      const { rows } = await query(
        'SELECT id, slug, name, description, logo_url, currency FROM venues WHERE slug = $1 AND is_active = true',
        [request.params.venueSlug]
      );
      if (rows.length === 0) return reply.status(404).send({ error: 'Venue not found' });
      return rows[0];
    }
  );
}
