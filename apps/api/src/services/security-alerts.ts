import { query } from '../db.js';
import type { AlertType } from '@tableorder/shared';

export async function createSecurityAlert(params: {
  venueId: string;
  sessionId?: string;
  alertType: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO security_alerts (venue_id, session_id, alert_type, severity, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      params.venueId,
      params.sessionId ?? null,
      params.alertType,
      params.severity,
      params.description,
      JSON.stringify(params.metadata ?? {}),
    ]
  );
  return rows[0].id;
}

export async function logGpsDenied(params: {
  venueId: string;
  tableId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO order_sessions (venue_id, table_id, scan_latitude, scan_longitude, token_jti, token_issued_at, token_expires_at, status, ip_address, user_agent)
     VALUES ($1, $2, 0, 0, 'gps-denied-' || gen_random_uuid(), now(), now(), 'gps_denied', $3, $4)
     RETURNING id`,
    [params.venueId, params.tableId, params.ipAddress ?? null, params.userAgent ?? null]
  );

  await createSecurityAlert({
    venueId: params.venueId,
    sessionId: rows[0].id,
    alertType: 'gps_denied',
    severity: 'medium',
    description: 'Customer denied GPS permission at scan time',
    metadata: { tableId: params.tableId, ipAddress: params.ipAddress },
  });
}
