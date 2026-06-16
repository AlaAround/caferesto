import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { resolveMenuImage, GENERIC_FOOD_IMAGE } from '@tableorder/shared';

interface Props {
  itemId: string;
  photoUrl?: string | null;
  alt: string;
  className?: string;
  aspect?: 'square' | 'video' | 'wide';
}

const aspectClasses = {
  square: 'aspect-square',
  video: 'aspect-[4/3]',
  wide: 'aspect-[16/10]',
};

export default function MenuItemImage({ itemId, photoUrl, alt, className = '', aspect = 'video' }: Props) {
  const resolved = resolveMenuImage(itemId, photoUrl, alt);
  const [src, setSrc] = useState(resolved);
  const [failed, setFailed] = useState(false);

  function handleError() {
    if (src !== GENERIC_FOOD_IMAGE) {
      setSrc(GENERIC_FOOD_IMAGE);
      return;
    }
    setFailed(true);
  }

  if (failed) {
    return (
      <div
        className={`${aspectClasses[aspect]} bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center ${className}`}
      >
        <UtensilsCrossed className="w-10 h-10 text-brand-400/60" />
      </div>
    );
  }

  return (
    <div className={`${aspectClasses[aspect]} overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={handleError}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
  );
}
