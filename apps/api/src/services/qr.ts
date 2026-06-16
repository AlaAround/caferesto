import QRCode from 'qrcode';
import { buildTableOrderUrl } from './staff-auth.js';

export async function generateTableQrDataUrl(
  venueSlug: string,
  tableNumber: number,
  origin?: string
): Promise<string> {
  const url = buildTableOrderUrl(venueSlug, tableNumber, origin);
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: { dark: '#1a2332', light: '#ffffff' },
  });
}

export async function generateTableQrBuffer(
  venueSlug: string,
  tableNumber: number,
  origin?: string
): Promise<Buffer> {
  const url = buildTableOrderUrl(venueSlug, tableNumber, origin);
  return QRCode.toBuffer(url, {
    width: 1024,
    margin: 2,
    type: 'png',
    color: { dark: '#1a2332', light: '#ffffff' },
  });
}
