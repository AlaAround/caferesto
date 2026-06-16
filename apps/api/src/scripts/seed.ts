import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seed() {
  const seedPath = resolve(__dirname, '../../../../database/seed.sql');
  let seed = readFileSync(seedPath, 'utf-8');

  const hash = await bcrypt.hash('demo1234', 10);
  seed = seed.replace('$2b$10$placeholder_will_be_set_by_seed_script', hash);

  await pool.query(seed);
  console.log('Seed data applied successfully.');
  console.log('Demo login: manager@elbhar.tn / demo1234');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
