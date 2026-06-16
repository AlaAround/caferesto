import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import type { AlertStatus } from '@tableorder/shared';

export async function securityRoutes(app: FastifyInstance) {
  app.get<{ Params: { venueId: string }; Querystring: { status?: string } }>(
    '/venues/:venueId/security-alerts',
    async (request) => {
      const { venueId } = request.params;
      const status = request.query.status || 'pending';

      const { rows } = await query(
        `SELECT sa.*, os.scan_latitude, os.scan_longitude, os.order_latitude, os.order_longitude,
                os.ip_address, os.device_fingerprint, vt.table_number
         FROM security_alerts sa
         LEFT JOIN order_sessions os ON os.id = sa.session_id
         LEFT JOIN venue_tables vt ON vt.id = os.table_id
         WHERE sa.venue_id = $1 AND sa.status = $2
         ORDER BY sa.created_at DESC LIMIT 50`,
        [venueId, status]
      );

      return { alerts: rows };
    }
  );

  app.patch<{ Params: { alertId: string }; Body: { status: AlertStatus; notes?: string; reviewedBy: string } }>(
    '/security-alerts/:alertId',
    async (request, reply) => {
      const { alertId } = request.params;
      const { status, notes, reviewedBy } = request.body;

      const { rows } = await query(
        `UPDATE security_alerts SET status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = now()
         WHERE id = $4 RETURNING *`,
        [status, notes ?? null, reviewedBy, alertId]
      );

      if (rows.length === 0) return reply.status(404).send({ error: 'Alert not found' });
      return rows[0];
    }
  );
}
