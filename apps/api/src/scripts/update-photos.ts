import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDefaultImagesForSeedItems, resolveMenuImage } from '@tableorder/shared';
import { pool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  const defaults = getDefaultImagesForSeedItems();
  let updated = 0;

  for (const { id, photoUrl } of defaults) {
    const result = await pool.query(
      `UPDATE menu_items SET photo_url = $1
       WHERE id = $2 AND (photo_url IS NULL OR photo_url = '')`,
      [photoUrl, id]
    );
    updated += result.rowCount ?? 0;
  }

  // Backfill any remaining items without photos using name-based matching
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM menu_items WHERE photo_url IS NULL OR photo_url = ''`
  );

  for (const row of rows) {
    const photoUrl = resolveMenuImage(row.id, null, row.name);
    await pool.query('UPDATE menu_items SET photo_url = $1 WHERE id = $2', [photoUrl, row.id]);
    updated++;
  }

  console.log(`Updated ${updated} menu item photo(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
