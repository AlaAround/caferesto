import { query } from '../db.js';

export async function verifyManagerStaff(
  staffId: string,
  venueId: string
): Promise<{ ok: true; role: string } | { ok: false; status: number; error: string; message?: string }> {
  const { rows } = await query<{ role: string }>(
    'SELECT role FROM staff_users WHERE id = $1 AND venue_id = $2 AND is_active = true',
    [staffId, venueId]
  );
  if (rows.length === 0) {
    return { ok: false, status: 403, error: 'Unauthorized' };
  }
  if (!['manager', 'owner'].includes(rows[0].role)) {
    return {
      ok: false,
      status: 403,
      error: 'MANAGER_REQUIRED',
      message: 'Only managers can perform this action',
    };
  }
  return { ok: true, role: rows[0].role };
}

export function buildTableOrderUrl(venueSlug: string, tableNumber: number, origin?: string): string {
  const base = origin || process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}/venue/${venueSlug}/table/${tableNumber}`;
}
