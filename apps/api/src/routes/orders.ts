import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { verifySessionToken, getTokenTtlSeconds } from '../services/token.js';
import { isTokenUsed, markTokenUsed } from '../redis.js';
import { validateProximity, validateTimeWindow, validateGpsDrift } from '../services/proximity.js';
import { createSecurityAlert } from '../services/security-alerts.js';
import { getIo } from '../socket.js';
import type { CartItem, PaymentMethod } from '@tableorder/shared';

interface SubmitOrderBody {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  notes?: string;
  latitude: number;
  longitude: number;
}

export async function orderRoutes(app: FastifyInstance) {
  // Gate 2 + 3: Token validation, proximity check, single-use enforcement
  app.post<{ Body: SubmitOrderBody }>(
    '/orders',
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'SESSION_TOKEN_REQUIRED' });
      }

      const token = authHeader.slice(7);
      let payload;
      try {
        payload = await verifySessionToken(token);
      } catch {
        return reply.status(401).send({ error: 'INVALID_TOKEN', message: 'Session token is invalid or expired' });
      }

      const body = request.body;

      // Gate 2: Single-use check
      if (await isTokenUsed(payload.jti)) {
        await createSecurityAlert({
          venueId: payload.venueId,
          alertType: 'token_reuse',
          severity: 'high',
          description: 'Attempted reuse of consumed session token',
          metadata: { jti: payload.jti },
        });
        return reply.status(403).send({ error: 'TOKEN_ALREADY_USED' });
      }

      // Gate 3: Time window
      const timeCheck = validateTimeWindow(payload.iat);
      if (!timeCheck.valid) {
        await createSecurityAlert({
          venueId: payload.venueId,
          alertType: 'token_expired',
          severity: 'medium',
          description: timeCheck.reason!,
          metadata: { jti: payload.jti, elapsedSeconds: timeCheck.elapsedSeconds },
        });
        return reply.status(403).send({ error: 'TOKEN_EXPIRED', message: timeCheck.reason });
      }

      // Gate 3: Proximity validation
      const proximityCheck = await validateProximity(payload.venueId, body.latitude, body.longitude);
      if (!proximityCheck.valid) {
        await createSecurityAlert({
          venueId: payload.venueId,
          alertType: 'location_too_far',
          severity: 'high',
          description: proximityCheck.reason!,
          metadata: {
            distanceMeters: proximityCheck.distanceMeters,
            maxRadius: proximityCheck.maxRadiusMeters,
            orderLat: body.latitude,
            orderLon: body.longitude,
          },
        });
        return reply.status(403).send({ error: 'LOCATION_TOO_FAR', message: proximityCheck.reason });
      }

      // Gate 4: GPS drift between scan and order
      const driftCheck = validateGpsDrift(
        payload.latitude,
        payload.longitude,
        body.latitude,
        body.longitude
      );
      if (!driftCheck.valid) {
        const { rows: sessionRows } = await query<{ id: string }>(
          'SELECT id FROM order_sessions WHERE token_jti = $1',
          [payload.jti]
        );
        await createSecurityAlert({
          venueId: payload.venueId,
          sessionId: sessionRows[0]?.id,
          alertType: 'gps_drift',
          severity: 'critical',
          description: driftCheck.reason!,
          metadata: { driftMeters: driftCheck.driftMeters },
        });
        return reply.status(403).send({ error: 'GPS_DRIFT', message: driftCheck.reason });
      }

      if (!body.items?.length) {
        return reply.status(400).send({ error: 'EMPTY_CART', message: 'No items in order' });
      }

      const subtotal = body.items.reduce((sum, item) => {
        const modTotal = item.modifiers.reduce((m, mod) => m + mod.priceDelta, 0);
        return sum + (item.unitPrice + modTotal) * item.quantity;
      }, 0);

      const { pool } = await import('../db.js');
      const dbClient = await pool.connect();

      try {
        await dbClient.query('BEGIN');

        const { rows: orderRows } = await dbClient.query<{ id: string; order_number: number }>(
          `INSERT INTO orders (venue_id, table_id, session_id, status, payment_method, payment_status, subtotal, total, notes)
           VALUES ($1, $2, (SELECT id FROM order_sessions WHERE token_jti = $3), 'received', $4, 'pending', $5, $5, $6)
           RETURNING id, order_number`,
          [payload.venueId, payload.tableId, payload.jti, body.paymentMethod, subtotal, body.notes ?? null]
        );
        const order = orderRows[0];

        for (const item of body.items) {
          const modTotal = item.modifiers.reduce((m, mod) => m + mod.priceDelta, 0);
          const lineTotal = (item.unitPrice + modTotal) * item.quantity;
          await dbClient.query(
            `INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, modifiers, notes, line_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [order.id, item.menuItemId, item.name, item.quantity, item.unitPrice, JSON.stringify(item.modifiers), item.notes ?? null, lineTotal]
          );
        }

        await dbClient.query(
          `UPDATE order_sessions SET status = 'used', token_used_at = now(),
           order_latitude = $1, order_longitude = $2, distance_from_venue_meters = $3
           WHERE token_jti = $4`,
          [body.latitude, body.longitude, proximityCheck.distanceMeters, payload.jti]
        );

        await dbClient.query('COMMIT');

        const ttl = getTokenTtlSeconds(payload.exp);
        await markTokenUsed(payload.jti, ttl);

        const { rows: fullOrder } = await query(
          `SELECT o.*, vt.table_number, vt.label as table_label
           FROM orders o JOIN venue_tables vt ON vt.id = o.table_id WHERE o.id = $1`,
          [order.id]
        );

        getIo().to(`venue:${payload.venueId}`).emit('order:new', fullOrder[0]);

        return {
          orderId: order.id,
          orderNumber: order.order_number,
          status: 'received',
          total: subtotal,
        };
      } catch (err) {
        await dbClient.query('ROLLBACK');
        throw err;
      } finally {
        dbClient.release();
      }
    }
  );

  app.get<{ Params: { orderId: string } }>(
    '/orders/:orderId',
    async (request, reply) => {
      const { rows } = await query(
        `SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status,
                o.subtotal, o.total, o.notes, o.created_at, o.updated_at,
                vt.table_number, vt.label as table_label
         FROM orders o JOIN venue_tables vt ON vt.id = o.table_id
         WHERE o.id = $1`,
        [request.params.orderId]
      );
      if (rows.length === 0) return reply.status(404).send({ error: 'Order not found' });

      const { rows: items } = await query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [request.params.orderId]
      );

      return { ...rows[0], items };
    }
  );
}
