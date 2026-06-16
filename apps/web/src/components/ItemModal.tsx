import { useState } from 'react';
import { X } from 'lucide-react';
import type { MenuItem } from '@tableorder/shared';
import { useCart, formatTND } from '../context/CartContext';
import MenuItemImage from './MenuItemImage';
import DietaryBadges from './DietaryBadges';

interface Props {
  item: MenuItem;
  onClose: () => void;
}

export default function ItemModal({ item, onClose }: Props) {
  const { addItem } = useCart();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const selectedModifiers = item.modifiers.flatMap((mod) => {
    const selectedId = selections[mod.id];
    const option = mod.options.find((o) => o.id === selectedId);
    if (!option) return [];
    return [{ name: mod.name, option: option.name, priceDelta: option.priceDelta }];
  });

  const modTotal = selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
  const canAdd = item.modifiers.filter((m) => m.isRequired).every((m) => selections[m.id]);

  function handleAdd() {
    addItem(item, selectedModifiers, notes || undefined);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-surface-dark/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-cream-50 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Hero image */}
        <div className="relative">
          <MenuItemImage
            itemId={item.id}
            photoUrl={item.photoUrl}
            alt={item.name}
            aspect="wide"
            className="rounded-t-3xl sm:rounded-t-3xl max-h-56"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-cream-50 via-transparent to-transparent rounded-t-3xl" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
          >
            <X className="w-5 h-5 text-surface-dark" />
          </button>
        </div>

        <div className="px-5 -mt-6 relative space-y-5 pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-surface-dark">{item.name}</h2>
            {item.description && (
              <p className="text-gray-500 mt-1.5 leading-relaxed">{item.description}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <DietaryBadges tags={item.dietaryTags} />
              <span className="text-xl font-bold text-brand-600">{formatTND(item.price + modTotal)}</span>
            </div>
          </div>

          {item.modifiers.map((mod) => (
            <div key={mod.id} className="card p-4">
              <h3 className="font-semibold mb-3 text-surface-dark">
                {mod.name} {mod.isRequired && <span className="text-brand-500">*</span>}
              </h3>
              <div className="space-y-2">
                {mod.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selections[mod.id] === opt.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-cream-200 bg-white hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={mod.id}
                        checked={selections[mod.id] === opt.id}
                        onChange={() => setSelections((s) => ({ ...s, [mod.id]: opt.id }))}
                        className="accent-brand-600 w-4 h-4"
                      />
                      <span className="font-medium">{opt.name}</span>
                    </div>
                    {opt.priceDelta > 0 && (
                      <span className="text-sm text-brand-600 font-medium">+{formatTND(opt.priceDelta)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="card p-4">
            <h3 className="font-semibold mb-2 text-surface-dark">Special instructions</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. no onions please"
              className="w-full p-3 bg-white border border-cream-200 rounded-xl resize-none h-20 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-cream-50/95 backdrop-blur-md p-5 border-t border-cream-200">
          <button onClick={handleAdd} disabled={!canAdd} className="btn-primary w-full !text-base">
            Add to Cart — {formatTND(item.price + modTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}
