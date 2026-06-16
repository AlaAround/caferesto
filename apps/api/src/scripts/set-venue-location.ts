import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const VENUE_SLUG = process.argv[2] || 'restoran-el-bhar';
const LAT = parseFloat(process.argv[3] ?? '');
const LON = parseFloat(process.argv[4] ?? '');
const RADIUS = parseInt(process.argv[5] ?? '200', 10);

if (Number.isNaN(LAT) || Number.isNaN(LON)) {
  console.log(`
Usage: npm run db:set-location -w @tableorder/api -- <latitude> <longitude> [radius_meters]

Example:
  npm run db:set-location -w @tableorder/api -- 36.8065 10.1815 500

Get your coordinates:
  - Google Maps: right-click your location → copy lat/lon
  - Browser console: navigator.geolocation.getCurrentPosition(p => console.log(p.coords.latitude, p.coords.longitude))
`);
  process.exit(1);
}

async function main() {
  const { rows } = await pool.query<{ name: string }>(
    `UPDATE venues SET latitude = $1, longitude = $2, proximity_radius_meters = $3
     WHERE slug = $4 RETURNING name`,
    [LAT, LON, RADIUS, VENUE_SLUG]
  );

  if (rows.length === 0) {
    console.error(`Venue "${VENUE_SLUG}" not found. Run npm run db:seed first.`);
    process.exit(1);
  }

  console.log(`Updated "${rows[0].name}" (${VENUE_SLUG}):`);
  console.log(`  latitude:  ${LAT}`);
  console.log(`  longitude: ${LON}`);
  console.log(`  radius:    ${RADIUS}m`);
  console.log('\nRe-scan the QR code to start a fresh session with the new location.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
