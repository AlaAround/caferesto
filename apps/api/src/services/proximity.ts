import { haversineDistance } from '@tableorder/shared';
import { query } from '../db.js';

export interface ProximityResult {
  valid: boolean;
  distanceMeters: number;
  maxRadiusMeters: number;
  reason?: string;
}

export interface TimeWindowResult {
  valid: boolean;
  elapsedSeconds: number;
  maxSeconds: number;
  reason?: string;
}

export async function validateProximity(
  venueId: string,
  customerLat: number,
  customerLon: number
): Promise<ProximityResult> {
  if (process.env.DEV_SKIP_PROXIMITY === 'true') {
    return { valid: true, distanceMeters: 0, maxRadiusMeters: Infinity };
  }

  const { rows } = await query<{
    latitude: number;
    longitude: number;
    proximity_radius_meters: number;
  }>('SELECT latitude, longitude, proximity_radius_meters FROM venues WHERE id = $1', [venueId]);

  if (rows.length === 0) {
    return { valid: false, distanceMeters: Infinity, maxRadiusMeters: 0, reason: 'Venue not found' };
  }

  const venue = rows[0];
  const distance = haversineDistance(customerLat, customerLon, venue.latitude, venue.longitude);
  const maxRadius = venue.proximity_radius_meters;

  if (distance > maxRadius) {
    return {
      valid: false,
      distanceMeters: Math.round(distance),
      maxRadiusMeters: maxRadius,
      reason: `Location is ${Math.round(distance)}m from venue (max ${maxRadius}m)`,
    };
  }

  return { valid: true, distanceMeters: Math.round(distance), maxRadiusMeters: maxRadius };
}

export function validateTimeWindow(tokenIssuedAt: number, expiryMinutes = 5): TimeWindowResult {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - tokenIssuedAt;
  const maxSeconds = expiryMinutes * 60;

  if (elapsed > maxSeconds) {
    return {
      valid: false,
      elapsedSeconds: elapsed,
      maxSeconds,
      reason: `Token expired ${elapsed - maxSeconds}s ago`,
    };
  }

  return { valid: true, elapsedSeconds: elapsed, maxSeconds };
}

export function validateGpsDrift(
  scanLat: number,
  scanLon: number,
  orderLat: number,
  orderLon: number,
  maxDriftMeters = 50
): { valid: boolean; driftMeters: number; reason?: string } {
  const drift = haversineDistance(scanLat, scanLon, orderLat, orderLon);

  if (drift > maxDriftMeters) {
    return {
      valid: false,
      driftMeters: Math.round(drift),
      reason: `GPS drift of ${Math.round(drift)}m between scan and order (max ${maxDriftMeters}m)`,
    };
  }

  return { valid: true, driftMeters: Math.round(drift) };
}
