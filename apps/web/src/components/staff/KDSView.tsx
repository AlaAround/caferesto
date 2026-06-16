import { Clock, Banknote, CreditCard } from 'lucide-react';
import { formatTND, type OrderStatus, type PaymentMethod, type PaymentStatus } from '@tableorder/shared';
import { getOrderAgeMinutes, getAgeColor } from '../../pages/staff/Dashboard';

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

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pay_at_table: 'Pay at table',
  card: 'Card',
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};
interface Props {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  received: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Delivered',
};

export default function KDSView({ orders, onUpdateStatus }: Props) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <span className="text-sm text-gray-500">{orders.length} active orders</span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No active orders</p>
          <p className="text-sm mt-1">New orders will appear here instantly</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            const ageMin = getOrderAgeMinutes(order.created_at);
            const nextStatus = NEXT_STATUS[order.status];

            return (
              <div
                key={order.id}
                className={`card border-l-4 ${getAgeColor(ageMin)} p-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-2xl font-bold">#{order.order_number}</span>
                    <span className="text-gray-500 ml-2">
                      Table {order.table_number}
                      {order.table_label && ` (${order.table_label})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {Math.floor(ageMin)}m
                  </div>
                </div>

                {order.payment_method && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {order.payment_method === 'card' ? (
                        <CreditCard className="w-3.5 h-3.5" />
                      ) : (
                        <Banknote className="w-3.5 h-3.5" />
                      )}
                      {PAYMENT_METHOD_LABELS[order.payment_method]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PAYMENT_STATUS_STYLES[order.payment_status]}`}>
                      {order.payment_status}
                    </span>
                  </div>
                )}

                <div className="space-y-2 mb-4">                  {order.items.map((item, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{item.quantity}x</span> {item.item_name}
                      {item.notes && <p className="text-gray-400 italic ml-4">{item.notes}</p>}
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">{order.notes}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">{formatTND(Number(order.total))}</span>
                  {nextStatus && (
                    <button
                      onClick={() => onUpdateStatus(order.id, nextStatus)}
                      className="btn-primary !py-2 !px-4 text-sm"
                    >
                      {ACTION_LABELS[order.status]}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
