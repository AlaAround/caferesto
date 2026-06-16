import { importPKCS8, importSPKI, SignJWT, jwtVerify, type KeyLike } from 'jose';
import { randomUUID } from 'crypto';
import type { SessionTokenPayload } from '@tableorder/shared';

const ALGORITHM = 'RS256';
const EXPIRY_MINUTES = Number(process.env.JWT_EXPIRY_MINUTES) || 5;

let privateKey: KeyLike | null = null;
let publicKey: KeyLike | null = null;

async function getPrivateKey(): Promise<KeyLike> {
  if (privateKey) return privateKey;
  const pem = process.env.JWT_PRIVATE_KEY;
  if (!pem) throw new Error('JWT_PRIVATE_KEY not configured. Run: npm run generate-keys -w @tableorder/api');
  privateKey = await importPKCS8(pem.replace(/\\n/g, '\n'), ALGORITHM);
  return privateKey;
}

async function getPublicKey(): Promise<KeyLike> {
  if (publicKey) return publicKey;
  const pem = process.env.JWT_PUBLIC_KEY;
  if (!pem) throw new Error('JWT_PUBLIC_KEY not configured');
  publicKey = await importSPKI(pem.replace(/\\n/g, '\n'), ALGORITHM);
  return publicKey;
}

export async function signSessionToken(params: {
  venueId: string;
  tableId: string;
  latitude: number;
  longitude: number;
}): Promise<{ token: string; jti: string; expiresAt: Date }> {
  const key = await getPrivateKey();
  const jti = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + EXPIRY_MINUTES * 60;

  const token = await new SignJWT({
    venueId: params.venueId,
    tableId: params.tableId,
    latitude: params.latitude,
    longitude: params.longitude,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);

  return { token, jti, expiresAt: new Date(exp * 1000) };
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, { algorithms: [ALGORITHM] });

  return {
    jti: payload.jti as string,
    venueId: payload.venueId as string,
    tableId: payload.tableId as string,
    latitude: payload.latitude as number,
    longitude: payload.longitude as number,
    iat: payload.iat as number,
    exp: payload.exp as number,
  };
}

export function getTokenTtlSeconds(exp: number): number {
  const remaining = exp - Math.floor(Date.now() / 1000);
  return Math.max(remaining, 60);
}
