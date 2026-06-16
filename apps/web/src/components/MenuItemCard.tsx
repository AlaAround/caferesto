import { Plus } from 'lucide-react';
import type { MenuItem } from '@tableorder/shared';
import { formatTND } from '../context/CartContext';
import MenuItemImage from './MenuItemImage';
import DietaryBadges from './DietaryBadges';

interface Props {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onSelect }: Props) {
  return (
    <button
      onClick={() => item.isAvailable && onSelect(item)}
      disabled={!item.isAvailable}
      className="card-interactive group w-full text-left disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-card"
    >
      <div className="relative">
        <MenuItemImage
          itemId={item.id}
          photoUrl={item.photoUrl}
          alt={item.name}
          aspect="wide"
          className="rounded-t-2xl"
        />
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-surface-dark/50 flex items-center justify-center rounded-t-2xl">
            <span className="bg-white/95 text-red-600 text-sm font-semibold px-4 py-1.5 rounded-full">
              Sold out
            </span>
          </div>
        )}
        {item.isAvailable && (
          <div className="absolute bottom-3 right-3 w-9 h-9 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-float sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Plus className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-surface-dark leading-snug">{item.name}</h3>
          <span className="font-bold text-brand-600 shrink-0">{formatTND(item.price)}</span>
        </div>
        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2.5 leading-relaxed">{item.description}</p>
        )}
        <DietaryBadges tags={item.dietaryTags} />
      </div>
    </button>
  );
}
