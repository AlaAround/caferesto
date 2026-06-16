import { Leaf, WheatOff, Sprout } from 'lucide-react';

const TAG_CONFIG: Record<string, { label: string; className: string; icon?: typeof Leaf }> = {
  vegan: { label: 'Vegan', className: 'bg-green-100 text-green-700', icon: Sprout },
  vegetarian: { label: 'Vegetarian', className: 'bg-emerald-100 text-emerald-700', icon: Leaf },
  'gluten-free': { label: 'Gluten-free', className: 'bg-amber-100 text-amber-700', icon: WheatOff },
};

interface Props {
  tags: string[];
}

export default function DietaryBadges({ tags }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const config = TAG_CONFIG[tag] ?? { label: tag, className: 'bg-gray-100 text-gray-600' };
        const Icon = config.icon;
        return (
          <span key={tag} className={`tag-pill ${config.className}`}>
            {Icon && <Icon className="w-3 h-3" />}
            {config.label}
          </span>
        );
      })}
    </div>
  );
}
