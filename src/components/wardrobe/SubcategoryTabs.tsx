import { cn } from '@/lib/utils';
import { ClothingCategory, ClothingSubcategory, SUBCATEGORY_OPTIONS } from '@/types/wardrobe';

interface SubcategoryTabsProps {
  category: ClothingCategory;
  activeSubcategory: ClothingSubcategory | 'all';
  onSubcategoryChange: (subcategory: ClothingSubcategory | 'all') => void;
  itemCounts?: Partial<Record<ClothingSubcategory | 'all', number>>;
}

export function SubcategoryTabs({ 
  category, 
  activeSubcategory, 
  onSubcategoryChange, 
  itemCounts 
}: SubcategoryTabsProps) {
  const subcategories = SUBCATEGORY_OPTIONS[category];

  return (
    <div className="overflow-x-auto scrollbar-hide border-t border-border/50">
      <div className="flex gap-1.5 px-4 py-2">
        {/* All option */}
        <button
          onClick={() => onSubcategoryChange('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
            activeSubcategory === 'all'
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          All
          {itemCounts?.all !== undefined && (
            <span className="ml-1 text-[10px] opacity-70">{itemCounts.all}</span>
          )}
        </button>

        {subcategories.map((sub) => {
          const isActive = activeSubcategory === sub.value;
          const count = itemCounts?.[sub.value];

          return (
            <button
              key={sub.value}
              onClick={() => onSubcategoryChange(sub.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {sub.label}
              {count !== undefined && count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
