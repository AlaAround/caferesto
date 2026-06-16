-- Backfill missing menu item photos
-- Or run: npm run db:update-photos

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000001' OR (photo_url IS NULL AND name ILIKE '%croissant%');

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1626082927389-6cd086324638?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000002' OR (photo_url IS NULL AND name ILIKE '%brik%');

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000003' OR (photo_url IS NULL AND name ILIKE '%salade%');

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000004' OR (photo_url IS NULL AND name ILIKE '%pasta%');

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b78a?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000005' OR (photo_url IS NULL AND name ILIKE '%sea bass%');

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000006' OR (photo_url IS NULL AND name ILIKE '%burger%');

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000007' OR (photo_url IS NULL AND name ILIKE '%frappuccino%');

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000008' OR (photo_url IS NULL AND name ILIKE '%tea%');

UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1519676867240-f03562e64512?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE id = 'e0000000-0000-4000-8000-000000000009' OR (photo_url IS NULL AND name ILIKE '%baklava%');

-- Generic fallback for any other items still missing a photo
UPDATE menu_items SET photo_url = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80&auto=format'
  WHERE photo_url IS NULL OR photo_url = '';
