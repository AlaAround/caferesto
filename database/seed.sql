-- Seed data: demo venue "Restoran El Bhar" with menu and tables

INSERT INTO venues (id, slug, name, description, latitude, longitude, proximity_radius_meters, currency)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'restoran-el-bhar',
  'Restoran El Bhar',
  'Fresh Mediterranean cuisine by the sea',
  36.8065, 10.1815,  -- Tunis, Tunisia (demo coordinates)
  100,
  'TND'
);

INSERT INTO venue_tables (id, venue_id, table_number, label) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 1, 'Terrace 1'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 2, 'Terrace 2'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 3, 'Indoor 1'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 4, 'Indoor 2'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 5, 'Bar'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 6, 'VIP'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 7, 'Window');

-- Demo staff (password: demo1234 — bcrypt hash generated at runtime in seed script)
INSERT INTO staff_users (id, venue_id, email, password_hash, name, role)
VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'manager@elbhar.tn',
  '$2b$10$placeholder_will_be_set_by_seed_script',
  'Ahmed Manager',
  'manager'
);

-- Categories
INSERT INTO menu_categories (id, venue_id, name, sort_order, available_from, available_until) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Breakfast', 1, '07:00', '11:00'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Starters', 2, NULL, NULL),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Mains', 3, NULL, NULL),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Drinks', 4, NULL, NULL),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Desserts', 5, NULL, NULL);

-- Menu items (with photos)
INSERT INTO menu_items (id, category_id, venue_id, name, description, price, photo_url, dietary_tags, sort_order) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Croissant & Coffee', 'Butter croissant with espresso or cappuccino', 8.500,
   'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&h=600&fit=crop&q=80', ARRAY['vegetarian'], 1),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Brik à l''œuf', 'Crispy pastry filled with egg, tuna, and capers', 6.000,
   'https://images.unsplash.com/photo-1626082927389-6cd086324638?w=800&h=600&fit=crop&q=80', '{}', 1),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Salade Mechouia', 'Grilled pepper and tomato salad with olive oil', 7.500,
   'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&h=600&fit=crop&q=80', ARRAY['vegan', 'gluten-free'], 2),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Harissa Pasta', 'Penne with Tunisian harissa sauce and grilled chicken', 18.000,
   'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=600&fit=crop&q=80', '{}', 1),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Grilled Sea Bass', 'Fresh catch with lemon herb butter and seasonal vegetables', 32.000,
   'https://images.unsplash.com/photo-1519708227418-c8fd9a32b78a?w=800&h=600&fit=crop&q=80', ARRAY['gluten-free'], 2),
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Burger El Bhar', 'Beef patty, aged cheddar, caramelised onions, house sauce', 22.000,
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop&q=80', '{}', 3),
  ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'Frappuccino', 'Iced blended coffee with whipped cream', 9.000,
   'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&h=600&fit=crop&q=80', ARRAY['vegetarian'], 1),
  ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'Fresh Mint Tea', 'Traditional Tunisian mint tea', 4.500,
   'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop&q=80', ARRAY['vegan'], 2),
  ('e0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'Baklava', 'Layers of phyllo with honey and pistachios', 8.000,
   'https://images.unsplash.com/photo-1519676867240-f03562e64512?w=800&h=600&fit=crop&q=80', ARRAY['vegetarian'], 1);

-- Modifiers for Burger
INSERT INTO menu_modifiers (id, item_id, name, type, is_required, sort_order) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000006', 'Size', 'single', true, 1);

INSERT INTO menu_modifier_options (modifier_id, name, price_delta, sort_order) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'Regular', 0, 1),
  ('f0000000-0000-4000-8000-000000000001', 'Large', 3.000, 2);

-- Modifiers for Frappuccino
INSERT INTO menu_modifiers (id, item_id, name, type, is_required, sort_order) VALUES
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000007', 'Sugar Level', 'single', false, 1);

INSERT INTO menu_modifier_options (modifier_id, name, price_delta, sort_order) VALUES
  ('f0000000-0000-4000-8000-000000000002', 'Normal', 0, 1),
  ('f0000000-0000-4000-8000-000000000002', 'Less Sugar', 0, 2),
  ('f0000000-0000-4000-8000-000000000002', 'No Sugar', 0, 3);
