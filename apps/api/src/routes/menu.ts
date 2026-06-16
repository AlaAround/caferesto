import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { resolveMenuImage } from '@tableorder/shared';

export async function menuRoutes(app: FastifyInstance) {
  app.get<{ Params: { venueSlug: string } }>(
    '/venues/:venueSlug/menu',
    async (request, reply) => {
      const { venueSlug } = request.params;

      const { rows: venueRows } = await query<{ id: string }>(
        'SELECT id FROM venues WHERE slug = $1 AND is_active = true',
        [venueSlug]
      );
      if (venueRows.length === 0) return reply.status(404).send({ error: 'Venue not found' });
      const venueId = venueRows[0].id;

      const { rows: categories } = await query<{
        id: string;
        name: string;
        description: string | null;
        sort_order: number;
        available_from: string | null;
        available_until: string | null;
      }>(
        `SELECT id, name, description, sort_order, available_from::text, available_until::text
         FROM menu_categories WHERE venue_id = $1 AND is_active = true ORDER BY sort_order`,
        [venueId]
      );

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const availableCategories = categories.filter((cat) => {
        if (!cat.available_from || !cat.available_until) return true;
        return currentTime >= cat.available_from && currentTime <= cat.available_until;
      });

      const { rows: items } = await query<{
        id: string;
        category_id: string;
        name: string;
        description: string | null;
        price: string;
        photo_url: string | null;
        dietary_tags: string[];
        is_available: boolean;
        sort_order: number;
      }>(
        `SELECT id, category_id, name, description, price, photo_url, dietary_tags, is_available, sort_order
         FROM menu_items WHERE venue_id = $1 ORDER BY sort_order`,
        [venueId]
      );

      const { rows: modifiers } = await query<{
        id: string;
        item_id: string;
        name: string;
        type: string;
        is_required: boolean;
        sort_order: number;
      }>(
        `SELECT m.id, m.item_id, m.name, m.type, m.is_required, m.sort_order
         FROM menu_modifiers m
         JOIN menu_items i ON i.id = m.item_id
         WHERE i.venue_id = $1 ORDER BY m.sort_order`,
        [venueId]
      );

      const { rows: options } = await query<{
        id: string;
        modifier_id: string;
        name: string;
        price_delta: string;
        sort_order: number;
      }>(
        `SELECT o.id, o.modifier_id, o.name, o.price_delta, o.sort_order
         FROM menu_modifier_options o
         JOIN menu_modifiers m ON m.id = o.modifier_id
         JOIN menu_items i ON i.id = m.item_id
         WHERE i.venue_id = $1 ORDER BY o.sort_order`,
        [venueId]
      );

      const menu = availableCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        items: items
          .filter((item) => item.category_id === cat.id)
          .map((item) => ({
            id: item.id,
            categoryId: item.category_id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            photoUrl: resolveMenuImage(item.id, item.photo_url, item.name),
            dietaryTags: item.dietary_tags,
            isAvailable: item.is_available,
            modifiers: modifiers
              .filter((m) => m.item_id === item.id)
              .map((m) => ({
                id: m.id,
                name: m.name,
                type: m.type as 'single' | 'multiple',
                isRequired: m.is_required,
                options: options
                  .filter((o) => o.modifier_id === m.id)
                  .map((o) => ({
                    id: o.id,
                    name: o.name,
                    priceDelta: Number(o.price_delta),
                  })),
              })),
          })),
      }));

      return { categories: menu };
    }
  );
}
