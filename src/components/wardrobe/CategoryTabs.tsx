import { cn } from '@/lib/utils';
import { ClothingCategory, CATEGORY_LABELS, ALL_CATEGORIES } from '@/types/wardrobe';

interface CategoryTabsProps {
  activeCategory: ClothingCategory | 'all';
  onCategoryChange: (category: ClothingCategory | 'all') => void;
  itemCounts?: Record<ClothingCategory | 'all', number>;
}

export function CategoryTabs({ activeCategory, onCategoryChange, itemCounts }: CategoryTabsProps) {
  const categories: (ClothingCategory | 'all')[] = ['all', ...ALL_CATEGORIES];

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-4 py-3">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          const label = category === 'all' ? 'All' : CATEGORY_LABELS[category];
          const count = itemCounts?.[category];

          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-elegant'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {label}
              {count !== undefined && (
                <span className={cn(
                  'text-xs',
                  isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}