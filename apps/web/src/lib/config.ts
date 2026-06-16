/** Production API URL (Render). Leave empty in dev — Vite proxy handles /api */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_URL ? `${API_URL}${p}` : p;
}
