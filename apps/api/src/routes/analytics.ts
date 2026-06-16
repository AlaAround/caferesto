import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';

export async function analyticsRoutes(app: FastifyInstance) {
  app.get<{ Params: { venueId: string } }>(
    '/venues/:venueId/analytics/today',
    async (request) => {
      const { venueId } = request.params;

      const { rows: revenueRows } = await query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
         FROM orders WHERE venue_id = $1 AND created_at >= CURRENT_DATE AND status != 'cancelled'`,
        [venueId]
      );

      const { rows: hourlyRows } = await query<{ hour: number; revenue: string; orders: string }>(
        `SELECT EXTRACT(HOUR FROM created_at)::int as hour,
                COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
         FROM orders WHERE venue_id = $1 AND created_at >= CURRENT_DATE AND status != 'cancelled'
         GROUP BY hour ORDER BY hour`,
        [venueId]
      );

      const { rows: itemRows } = await query<{ item_name: string; total_qty: string; revenue: string }>(
        `SELECT oi.item_name, SUM(oi.quantity) as total_qty, SUM(oi.line_total) as revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.venue_id = $1 AND o.created_at >= CURRENT_DATE AND o.status != 'cancelled'
         GROUP BY oi.item_name ORDER BY total_qty DESC LIMIT 20`,
        [venueId]
      );

      const { rows: tableRows } = await query<{ table_number: number; orders: string; revenue: string }>(
        `SELECT vt.table_number, COUNT(o.id) as orders, COALESCE(SUM(o.total), 0) as revenue
         FROM orders o JOIN venue_tables vt ON vt.id = o.table_id
         WHERE o.venue_id = $1 AND o.created_at >= CURRENT_DATE AND o.status != 'cancelled'
         GROUP BY vt.table_number ORDER BY orders DESC`,
        [venueId]
      );

      const { rows: categoryRows } = await query<{ category: string; revenue: string }>(
        `SELECT mc.name as category, COALESCE(SUM(oi.line_total), 0) as revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN menu_items mi ON mi.id = oi.menu_item_id
         JOIN menu_categories mc ON mc.id = mi.category_id
         WHERE o.venue_id = $1 AND o.created_at >= CURRENT_DATE AND o.status != 'cancelled'
         GROUP BY mc.name ORDER BY revenue DESC`,
        [venueId]
      );

      const { rows: securityRows } = await query<{ alert_type: string; count: string }>(
        `SELECT alert_type, COUNT(*) as count FROM security_alerts
         WHERE venue_id = $1 AND created_at >= CURRENT_DATE GROUP BY alert_type`,
        [venueId]
      );

      return {
        revenue: {
          total: Number(revenueRows[0].total),
          orderCount: Number(revenueRows[0].count),
          avgOrderValue: Number(revenueRows[0].count) > 0
            ? Number(revenueRows[0].total) / Number(revenueRows[0].count)
            : 0,
        },
        hourly: hourlyRows.map((r) => ({
          hour: r.hour,
          revenue: Number(r.revenue),
          orders: Number(r.orders),
        })),
        topItems: itemRows.map((r) => ({
          name: r.item_name,
          quantity: Number(r.total_qty),
          revenue: Number(r.revenue),
        })),
        tables: tableRows.map((r) => ({
          tableNumber: r.table_number,
          orders: Number(r.orders),
          revenue: Number(r.revenue),
        })),
        categories: categoryRows.map((r) => ({
          name: r.category,
          revenue: Number(r.revenue),
        })),
        security: securityRows.map((r) => ({
          type: r.alert_type,
          count: Number(r.count),
        })),
      };
    }
  );
}
