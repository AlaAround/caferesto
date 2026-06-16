import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Trash2, CreditCard, Banknote, ShoppingBag } from 'lucide-react';
import { useCart, formatTND } from '../../context/CartContext';
import { authApi, getSessionToken, clearSession } from '../../lib/api';
import { requestGeolocation, isGeolocationError } from '../../lib/geolocation';
import { getMenuImage } from '../../lib/menu-images';
import type { PaymentMethod } from '@tableorder/shared';

export default function CartPage() {
  const { venueSlug, tableNumber } = useParams();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pay_at_table');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submitOrder() {
    const token = getSessionToken();
    if (!token) {
      navigate(`/venue/${venueSlug}/table/${tableNumber}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let latitude: number;
      let longitude: number;
      try {
        const position = await requestGeolocation();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (geoErr: unknown) {
        if (isGeolocationError(geoErr)) {
          setError(geoErr.message);
        } else {
          setError('Could not read your location. Please try again.');
        }
        return;
      }

      const result = await authApi<{ orderId: string; orderNumber: number }>(
        '/orders',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            items,
            paymentMethod,
            notes: notes || undefined,
            latitude,
            longitude,
          }),
        }
      );

      clearCart();
      clearSession();
      navigate(`/order/${result.orderId}`);
    } catch (err: unknown) {
      const apiErr = err as { error?: string; message?: string };
      const messages: Record<string, string> = {
        EMPTY_CART: 'Your cart is empty.',
        TOKEN_EXPIRED: 'Your session expired. Please scan the QR code again.',
        LOCATION_TOO_FAR: 'You appear to be too far from the venue.',
        GPS_DRIFT: 'Location mismatch detected. Please scan the QR code again.',
        TOKEN_ALREADY_USED: 'This session was already used. Please scan again.',
      };
      setError(messages[apiErr.error || ''] || apiErr.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-warm-gradient flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-cream-200 rounded-full flex items-center justify-center mb-5">
          <ShoppingBag className="w-9 h-9 text-gray-400" />
        </div>
        <p className="font-display text-xl font-bold text-surface-dark mb-2">Your cart is empty</p>
        <p className="text-gray-500 mb-6 text-center">Browse our menu and add something delicious</p>
        <Link to={`/venue/${venueSlug}/table/${tableNumber}/menu`} className="btn-primary">
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-gradient pb-36">
      <header className="sticky top-0 z-10 bg-cream-50/95 backdrop-blur-md border-b border-cream-200 px-4 py-4 flex items-center gap-3 max-w-lg mx-auto">
        <Link
          to={`/venue/${venueSlug}/table/${tableNumber}/menu`}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-cream-200 hover:bg-cream-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold">Your Order</h1>
          <p className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
      </header>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {items.map((item, i) => {
          const modTotal = item.modifiers.reduce((s, m) => s + m.priceDelta, 0);
          const lineTotal = (item.unitPrice + modTotal) * item.quantity;
          const imgSrc = getMenuImage(item.menuItemId, undefined, item.name);

          return (
            <div key={i} className="card p-3 flex gap-3">
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-surface-dark">{item.name}</h3>
                    {item.modifiers.map((m) => (
                      <p key={m.name} className="text-xs text-gray-500">{m.option}</p>
                    ))}
                    {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">{item.notes}</p>}
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(i, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center hover:bg-cream-200 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-semibold w-5 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(i, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-bold text-brand-600">{formatTND(lineTotal)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Order notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests for the kitchen?"
            className="w-full p-3 bg-cream-50 border border-cream-200 rounded-xl resize-none h-16 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">Payment method</h3>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: 'pay_at_table' as PaymentMethod, icon: Banknote, label: 'Pay at table', sub: 'Cash or card' },
              { id: 'card' as PaymentMethod, icon: CreditCard, label: 'Pay now', sub: 'Card / wallet' },
            ]).map(({ id, icon: Icon, label, sub }) => (
              <button
                key={id}
                onClick={() => setPaymentMethod(id)}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === id
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-cream-200 bg-white hover:border-brand-200'
                }`}
              >
                <Icon className={`w-6 h-6 ${paymentMethod === id ? 'text-brand-600' : 'text-gray-400'}`} />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-gray-400">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-cream-50/95 backdrop-blur-md border-t border-cream-200 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-3 px-1">
            <span className="text-gray-500">Total</span>
            <span className="text-2xl font-bold text-surface-dark">{formatTND(total)}</span>
          </div>
          <button onClick={submitOrder} disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Placing your order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
