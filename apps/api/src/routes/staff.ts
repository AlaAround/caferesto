import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { getIo } from '../socket.js';
import { verifyManagerStaff, buildTableOrderUrl } from '../services/staff-auth.js';
import { generateTableQrDataUrl, generateTableQrBuffer } from '../services/qr.js';
import type { OrderStatus } from '@tableorder/shared';
export async function staffRoutes(app: FastifyInstance) {
  app.post<{ Body: { email: string; password: string; venueSlug: string } }>(
    '/login',
    async (request, reply) => {
      const { email, password, venueSlug } = request.body;

      const { rows } = await query<{ id: string; password_hash: string; name: string; role: string; venue_id: string }>(
        `SELECT su.id, su.password_hash, su.name, su.role, su.venue_id
         FROM staff_users su JOIN venues v ON v.id = su.venue_id
         WHERE su.email = $1 AND v.slug = $2 AND su.is_active = true`,
        [email, venueSlug]
      );

      if (rows.length === 0) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

      return {
        user: { id: user.id, name: user.name, role: user.role, venueId: user.venue_id },
        venueSlug,
      };
    }
  );

  app.get<{ Params: { venueId: string }; Querystring: { status?: string } }>(
    '/venues/:venueId/orders',
    async (request) => {
      const { venueId } = request.params;
      const statusFilter = request.query.status;

      let sql = `
        SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status,
               o.subtotal, o.total, o.notes, o.created_at, o.updated_at,
               vt.table_number, vt.label as table_label
        FROM orders o JOIN venue_tables vt ON vt.id = o.table_id
        WHERE o.venue_id = $1`;
      const params: unknown[] = [venueId];

      if (statusFilter) {
        sql += ` AND o.status = $2`;
        params.push(statusFilter);
      } else {
        sql += ` AND o.status NOT IN ('delivered', 'cancelled')`;
      }

      sql += ' ORDER BY o.created_at ASC';

      const { rows: orders } = await query(sql, params);

      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const { rows: items } = await query(
            'SELECT * FROM order_items WHERE order_id = $1',
            [(order as { id: string }).id]
          );
          return { ...order, items };
        })
      );

      return { orders: ordersWithItems };
    }
  );

  app.patch<{ Params: { orderId: string }; Body: { status: OrderStatus } }>(
    '/orders/:orderId/status',
    async (request, reply) => {
      const { orderId } = request.params;
      const { status } = request.body;

      const { rows } = await query<{ venue_id: string }>(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING venue_id',
        [status, orderId]
      );

      if (rows.length === 0) return reply.status(404).send({ error: 'Order not found' });

      getIo().to(`venue:${rows[0].venue_id}`).emit('order:updated', { orderId, status });
      getIo().to(`order:${orderId}`).emit('order:status', { orderId, status });

      return { orderId, status };
    }
  );

  app.get<{ Params: { venueId: string } }>(
    '/venues/:venueId/tables',
    async (request) => {
      const { rows } = await query<{
        id: string;
        table_number: number;
        label: string | null;
        active_orders: string;
        slug: string;
      }>(
        `SELECT vt.id, vt.table_number, vt.label, v.slug,
                (SELECT COUNT(*) FROM orders o WHERE o.table_id = vt.id AND o.status NOT IN ('delivered', 'cancelled')) as active_orders
         FROM venue_tables vt
         JOIN venues v ON v.id = vt.venue_id
         WHERE vt.venue_id = $1 AND vt.is_active = true
         ORDER BY vt.table_number`,
        [request.params.venueId]
      );
      const origin = process.env.PUBLIC_APP_URL || request.headers.origin;
      return {
        tables: rows.map((t) => ({
          id: t.id,
          tableNumber: t.table_number,
          label: t.label,
          activeOrders: Number(t.active_orders),
          orderUrl: buildTableOrderUrl(t.slug, t.table_number, origin),
        })),
      };
    }
  );
  app.get<{ Params: { venueId: string } }>(
    '/venues/:venueId/location',
    async (request, reply) => {
      const { rows } = await query<{
        name: string;
        latitude: number;
        longitude: number;
        proximity_radius_meters: number;
      }>(
        `SELECT name, latitude, longitude, proximity_radius_meters
         FROM venues WHERE id = $1 AND is_active = true`,
        [request.params.venueId]
      );
      if (rows.length === 0) return reply.status(404).send({ error: 'Venue not found' });
      const v = rows[0];
      return {
        name: v.name,
        latitude: v.latitude,
        longitude: v.longitude,
        proximityRadiusMeters: v.proximity_radius_meters,
      };
    }
  );

  app.patch<{
    Params: { venueId: string };
    Body: { latitude: number; longitude: number; proximityRadiusMeters: number; staffId: string };
  }>(
    '/venues/:venueId/location',
    async (request, reply) => {
      const { venueId } = request.params;
      const { latitude, longitude, proximityRadiusMeters, staffId } = request.body;

      const auth = await verifyManagerStaff(staffId, venueId);
      if (!auth.ok) {
        return reply.status(auth.status).send({ error: auth.error, message: auth.message });
      }

      if (
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
      ) {
        return reply.status(400).send({ error: 'Invalid coordinates' });
      }

      const radius = Math.min(Math.max(Math.round(proximityRadiusMeters), 10), 5000);

      const { rows } = await query<{
        name: string;
        latitude: number;
        longitude: number;
        proximity_radius_meters: number;
      }>(
        `UPDATE venues SET latitude = $1, longitude = $2, proximity_radius_meters = $3
         WHERE id = $4 AND is_active = true
         RETURNING name, latitude, longitude, proximity_radius_meters`,
        [latitude, longitude, radius, venueId]
      );

      if (rows.length === 0) return reply.status(404).send({ error: 'Venue not found' });

      const v = rows[0];
      return {
        name: v.name,
        latitude: v.latitude,
        longitude: v.longitude,
        proximityRadiusMeters: v.proximity_radius_meters,
      };
    }
  );

  app.post<{
    Params: { venueId: string };
    Body: { tableNumber?: number; label?: string; staffId: string };
  }>(
    '/venues/:venueId/tables',
    async (request, reply) => {
      const { venueId } = request.params;
      const { tableNumber, label, staffId } = request.body;

      const auth = await verifyManagerStaff(staffId, venueId);
      if (!auth.ok) {
        return reply.status(auth.status).send({ error: auth.error, message: auth.message });
      }

      let number = tableNumber;
      if (number === undefined || number === null) {
        const { rows: maxRows } = await query<{ max: number | null }>(
          'SELECT MAX(table_number) as max FROM venue_tables WHERE venue_id = $1',
          [venueId]
        );
        number = (maxRows[0].max ?? 0) + 1;
      }

      if (!Number.isInteger(number) || number < 1) {
        return reply.status(400).send({ error: 'Invalid table number' });
      }

      const { rows: venueRows } = await query<{ slug: string }>(
        'SELECT slug FROM venues WHERE id = $1',
        [venueId]
      );
      if (venueRows.length === 0) return reply.status(404).send({ error: 'Venue not found' });

      try {
        const { rows } = await query<{
          id: string;
          table_number: number;
          label: string | null;
        }>(
          `INSERT INTO venue_tables (venue_id, table_number, label)
           VALUES ($1, $2, $3)
           RETURNING id, table_number, label`,
          [venueId, number, label?.trim() || null]
        );

        const table = rows[0];
        const orderUrl = buildTableOrderUrl(
          venueRows[0].slug,
          table.table_number,
          process.env.PUBLIC_APP_URL || request.headers.origin
        );

        return {
          table: {
            id: table.id,
            tableNumber: table.table_number,
            label: table.label,
            activeOrders: 0,
            orderUrl,
          },
        };
      } catch (err: unknown) {
        const pgErr = err as { code?: string };
        if (pgErr.code === '23505') {
          return reply.status(409).send({ error: 'TABLE_EXISTS', message: `Table ${number} already exists` });
        }
        throw err;
      }
    }
  );

  app.delete<{ Params: { venueId: string; tableId: string }; Querystring: { staffId: string } }>(
    '/venues/:venueId/tables/:tableId',
    async (request, reply) => {
      const { venueId, tableId } = request.params;
      const { staffId } = request.query;

      if (!staffId) return reply.status(400).send({ error: 'staffId required' });
      const auth = await verifyManagerStaff(staffId, venueId);
      if (!auth.ok) {
        return reply.status(auth.status).send({ error: auth.error, message: auth.message });
      }

      const { rows: active } = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM orders
         WHERE table_id = $1 AND status NOT IN ('delivered', 'cancelled')`,
        [tableId]
      );
      if (Number(active[0].count) > 0) {
        return reply.status(409).send({
          error: 'ACTIVE_ORDERS',
          message: 'Cannot delete a table with active orders',
        });
      }

      const { rows } = await query<{ id: string }>(
        `UPDATE venue_tables SET is_active = false
         WHERE id = $1 AND venue_id = $2 AND is_active = true
         RETURNING id`,
        [tableId, venueId]
      );

      if (rows.length === 0) return reply.status(404).send({ error: 'Table not found' });
      return { deleted: true, tableId };
    }
  );

  app.get<{ Params: { venueId: string; tableId: string }; Querystring: { download?: string } }>(
    '/venues/:venueId/tables/:tableId/qr',
    async (request, reply) => {
      const { venueId, tableId } = request.params;

      const { rows } = await query<{ table_number: number; slug: string }>(
        `SELECT vt.table_number, v.slug
         FROM venue_tables vt JOIN venues v ON v.id = vt.venue_id
         WHERE vt.id = $1 AND vt.venue_id = $2 AND vt.is_active = true`,
        [tableId, venueId]
      );
      if (rows.length === 0) return reply.status(404).send({ error: 'Table not found' });

      const origin = process.env.PUBLIC_APP_URL || request.headers.origin;
      const { table_number, slug } = rows[0];

      if (request.query.download === '1') {
        const png = await generateTableQrBuffer(slug, table_number, origin);
        reply.header('Content-Type', 'image/png');
        reply.header(
          'Content-Disposition',
          `attachment; filename="table-${table_number}-qr.png"`
        );
        return reply.send(png);
      }

      const dataUrl = await generateTableQrDataUrl(slug, table_number, origin);
      const orderUrl = buildTableOrderUrl(slug, table_number, origin);
      return { dataUrl, orderUrl, tableNumber: table_number };
    }
  );
}
