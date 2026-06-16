import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Clock, ChefHat, Truck, PartyPopper } from 'lucide-react';
import { api } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { ORDER_STATUS_LABELS, formatTND, type OrderStatus } from '@tableorder/shared';

const STATUS_STEPS: { key: OrderStatus; icon: typeof Check; label: string }[] = [
  { key: 'received', icon: Check, label: 'Received' },
  { key: 'preparing', icon: ChefHat, label: 'Being prepared' },
  { key: 'ready', icon: Truck, label: 'On its way' },
  { key: 'delivered', icon: PartyPopper, label: 'Enjoy!' },
];

const STATUS_ORDER: OrderStatus[] = ['received', 'preparing', 'ready', 'delivered'];

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { joinOrder, on } = useSocket();
  const [status, setStatus] = useState<OrderStatus>('received');
  const [orderNumber, setOrderNumber] = useState(0);
  const [total, setTotal] = useState(0);
  const [tableNumber, setTableNumber] = useState(0);

  useEffect(() => {
    api<{
      status: OrderStatus;
      order_number: number;
      total: string;
      table_number: number;
    }>(`/orders/${orderId}`).then((order) => {
      setStatus(order.status);
      setOrderNumber(order.order_number);
      setTotal(Number(order.total));
      setTableNumber(order.table_number);
    });
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    joinOrder(orderId);
    const cleanup = on('order:status', (data: unknown) => {
      const { status: newStatus } = data as { status: OrderStatus };
      setStatus(newStatus);
    });
    return cleanup;
  }, [orderId, joinOrder, on]);

  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="min-h-screen bg-hero-gradient text-white flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-sm w-full">
        <div className="text-center mb-10">
          <p className="text-brand-300 text-sm font-medium mb-2">Order #{orderNumber}</p>
          <h1 className="font-display text-4xl font-bold mb-2">{ORDER_STATUS_LABELS[status]}</h1>
          <p className="text-gray-400">Table {tableNumber} · {formatTND(total)}</p>
        </div>

        <div className="card bg-white/5 border-white/10 backdrop-blur-sm p-6 mb-6">
          {STATUS_STEPS.map((step, i) => {
            const stepIndex = STATUS_ORDER.indexOf(step.key);
            const isActive = stepIndex <= currentIndex;
            const isCurrent = step.key === status;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isActive
                        ? isCurrent
                          ? 'bg-brand-500 text-white ring-4 ring-brand-500/30 scale-110'
                          : 'bg-ocean-600 text-white'
                        : 'bg-white/10 text-gray-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-10 my-1 transition-colors duration-500 ${
                        isActive && stepIndex < currentIndex ? 'bg-ocean-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
                <div className="pt-2.5 pb-6">
                  <p className={`font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  {isCurrent && status !== 'delivered' && (
                    <p className="text-sm text-brand-300 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 animate-pulse" /> In progress
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {status === 'delivered' && (
          <div className="p-5 bg-brand-600/20 border border-brand-500/30 rounded-2xl text-center">
            <p className="font-display text-xl font-bold text-brand-300 mb-1">Bon appétit!</p>
            <p className="text-sm text-gray-400">Thank you for dining with us.</p>
          </div>
        )}
      </div>
    </div>
  );
}
