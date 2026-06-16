const API_BASE = '/api';

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers, ...rest } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw err;
  }
  return res.json();
}

export function authApi<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const { headers, ...rest } = options ?? {};
  return api<T>(path, {
    ...rest,
    headers: {
      ...(headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fp', 2, 2);
  }
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    canvas.toDataURL(),
  ].join('|');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

export function getSessionToken(): string | null {
  return sessionStorage.getItem('sessionToken');
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem('sessionToken', token);
}

export function clearSession(): void {
  sessionStorage.removeItem('sessionToken');
  sessionStorage.removeItem('venueSlug');
  sessionStorage.removeItem('tableNumber');
}
