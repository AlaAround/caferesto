import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, ChefHat, Shield, BarChart3, LogOut, MapPin, QrCode,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { type OrderStatus, type PaymentMethod, type PaymentStatus } from '@tableorder/shared';
import KDSView from '../../components/staff/KDSView';
import SecurityAlerts from '../../components/staff/SecurityAlerts';
import AnalyticsPanel from '../../components/staff/AnalyticsPanel';
import VenueLocationSettings from '../../components/staff/VenueLocationSettings';
import TableManagement from '../../components/staff/TableManagement';

type Tab = 'kds' | 'security' | 'analytics' | 'location' | 'tables';

interface Order {
  id: string;
  order_number: number;
  status: OrderStatus;
  table_number: number;
  table_label: string | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  total: string;
  created_at: string;
  items: { item_name: string; quantity: number; notes: string | null; modifiers: unknown }[];
  notes: string | null;
}

export default function StaffDashboard() {
  const { venueSlug } = useParams();
  const navigate = useNavigate();
  const { joinVenue, on } = useSocket();
  const [tab, setTab] = useState<Tab>('kds');
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffUser, setStaffUser] = useState<{ id: string; name: string; role: string; venueId: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('staffUser');
    if (!stored) {
      navigate(`/staff/${venueSlug}`);
      return;
    }
    const user = JSON.parse(stored);
    setStaffUser(user);
    joinVenue(user.venueId);
    loadOrders(user.venueId);
  }, [venueSlug, navigate, joinVenue]);

  const loadOrders = useCallback(async (venueId: string) => {
    const data = await api<{ orders: Order[] }>(`/staff/venues/${venueId}/orders`);
    setOrders(data.orders);
  }, []);

  useEffect(() => {
    const cleanup1 = on('order:new', () => {
      if (staffUser) loadOrders(staffUser.venueId);
    });
    const cleanup2 = on('order:updated', () => {
      if (staffUser) loadOrders(staffUser.venueId);
    });
    return () => { cleanup1(); cleanup2(); };
  }, [staffUser, on, loadOrders]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    await api(`/staff/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (staffUser) loadOrders(staffUser.venueId);
  }

  function logout() {
    sessionStorage.removeItem('staffUser');
    navigate(`/staff/${venueSlug}`);
  }

  if (!staffUser) return null;

  const tabs = [
    { id: 'kds' as Tab, label: 'Kitchen', icon: ChefHat },
    { id: 'security' as Tab, label: 'Security', icon: Shield },
    { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
    { id: 'tables' as Tab, label: 'Tables', icon: QrCode },
    { id: 'location' as Tab, label: 'Location', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-56 bg-surface-dark text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-brand-500" />
            <span className="font-bold">TableOrder</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{staffUser.name}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <button onClick={logout} className="p-4 flex items-center gap-2 text-gray-400 hover:text-white text-sm border-t border-white/10">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        {tab === 'kds' && (
          <KDSView orders={orders} onUpdateStatus={updateStatus} />
        )}
        {tab === 'security' && (
          <SecurityAlerts venueId={staffUser.venueId} staffId={staffUser.id} />
        )}
        {tab === 'analytics' && (
          <AnalyticsPanel venueId={staffUser.venueId} />
        )}
        {tab === 'location' && (
          <VenueLocationSettings
            venueId={staffUser.venueId}
            staffId={staffUser.id}
            staffRole={staffUser.role}
          />
        )}
        {tab === 'tables' && (
          <TableManagement
            venueId={staffUser.venueId}
            staffId={staffUser.id}
            staffRole={staffUser.role}
          />
        )}
      </main>
    </div>
  );
}

export function getOrderAgeMinutes(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / 60000;
}

export function getAgeColor(minutes: number): string {
  if (minutes < 5) return 'border-l-green-500';
  if (minutes < 10) return 'border-l-yellow-500';
  return 'border-l-red-500';
}
