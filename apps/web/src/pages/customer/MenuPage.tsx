import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ShoppingCart, Sparkles } from 'lucide-react';
import { api, getSessionToken } from '../../lib/api';
import { useCart, formatTND } from '../../context/CartContext';
import type { MenuCategory, MenuItem } from '@tableorder/shared';
import { VENUE_HERO } from '../../lib/menu-images';
import MenuItemCard from '../../components/MenuItemCard';
import ItemModal from '../../components/ItemModal';

export default function MenuPage() {
  const { venueSlug, tableNumber } = useParams();
  const navigate = useNavigate();
  const { itemCount, total } = useCart();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [venueName, setVenueName] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!getSessionToken()) {
      navigate(`/venue/${venueSlug}/table/${tableNumber}`);
      return;
    }

    Promise.all([
      api<{ categories: MenuCategory[] }>(`/venues/${venueSlug}/menu`),
      api<{ name: string }>(`/venues/${venueSlug}`),
    ]).then(([menu, venue]) => {
      setCategories(menu.categories);
      setActiveCategory(menu.categories[0]?.id ?? '');
      setVenueName(venue.name);
      setLoading(false);
    });
  }, [venueSlug, tableNumber, navigate]);

  function scrollToCategory(categoryId: string) {
    setActiveCategory(categoryId);
    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-gradient">
        <div className="h-48 bg-gray-200 animate-pulse" />
        <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-64 animate-pulse bg-cream-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-gradient pb-28">
      {/* Hero header */}
      <div className="relative h-44 sm:h-52 overflow-hidden">
        <img
          src={VENUE_HERO}
          alt={venueName}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/60 to-surface-dark/20" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <p className="text-brand-300 text-sm font-medium mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Table {tableNumber}
          </p>
          <h1 className="font-display text-3xl font-bold text-white">{venueName}</h1>
        </div>
      </div>

      {/* Category nav */}
      {categories.length > 1 && (
        <div className="sticky top-0 z-20 bg-cream-50/95 backdrop-blur-md border-b border-cream-200">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide max-w-lg mx-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-cream-200 hover:border-brand-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu sections */}
      <div className="px-4 py-6 space-y-10 max-w-lg mx-auto">
        {categories.map((cat) => (
          <section
            key={cat.id}
            ref={(el) => { sectionRefs.current[cat.id] = el; }}
            className="scroll-mt-16"
          >
            <h2 className="section-title mb-4">{cat.name}</h2>
            <div className="space-y-4">
              {cat.items.map((item) => (
                <MenuItemCard key={item.id} item={item} onSelect={setSelectedItem} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-cream-50 via-cream-50 to-transparent pt-8">
          <div className="max-w-lg mx-auto">
            <Link
              to={`/venue/${venueSlug}/table/${tableNumber}/cart`}
              className="btn-primary w-full flex items-center justify-between gap-3 !py-4"
            >
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                  {itemCount}
                </span>
                <ShoppingCart className="w-5 h-5" />
                View Cart
              </span>
              <span className="font-bold">{formatTND(total)}</span>
            </Link>
          </div>
        </div>
      )}

      {selectedItem && (
        <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
