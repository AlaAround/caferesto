export type OrderStatus = 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'card' | 'pay_at_table';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type SessionStatus = 'active' | 'used' | 'expired' | 'blocked' | 'gps_denied';
export type AlertType =
  | 'gps_denied'
  | 'location_too_far'
  | 'token_expired'
  | 'token_reuse'
  | 'gps_drift'
  | 'multi_location_device'
  | 'high_scan_volume_ip'
  | 'suspicious_pattern';
export type AlertStatus = 'pending' | 'approved' | 'blocked' | 'dismissed';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface SessionTokenPayload {
  jti: string;
  venueId: string;
  tableId: string;
  latitude: number;
  longitude: number;
  iat: number;
  exp: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; option: string; priceDelta: number }[];
  notes?: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  dietaryTags: string[];
  isAvailable: boolean;
  modifiers: MenuModifier[];
}

export interface MenuModifier {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  options: { id: string; name: string; priceDelta: number }[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  items: MenuItem[];
}

export interface Order {
  id: string;
  orderNumber: number;
  tableNumber: number;
  tableLabel: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  subtotal: number;
  total: number;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; option: string; priceDelta: number }[];
  notes: string | null;
  lineTotal: number;
}

export interface SecurityAlert {
  id: string;
  alertType: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: AlertStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Received',
  preparing: 'Being prepared',
  ready: 'On its way',
  delivered: 'Enjoy!',
  cancelled: 'Cancelled',
};

export function formatTND(amount: number): string {
  return `${amount.toFixed(3)} TND`;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export {
  resolveMenuImage,
  MENU_IMAGES_BY_ID,
  GENERIC_FOOD_IMAGE,
  VENUE_HERO_IMAGE,
  getDefaultImagesForSeedItems,
} from './menu-images.js';
