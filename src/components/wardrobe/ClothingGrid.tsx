import { ClothingItem } from '@/types/wardrobe';
import { ClothingCard } from './ClothingCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClothingGridProps {
  items: ClothingItem[];
  onItemSelect?: (item: ClothingItem) => void;
  onItemDelete?: (item: ClothingItem) => void;
  onAddClick?: () => void;
  selectedItems?: string[];
  selectable?: boolean;
  isLoading?: boolean;
}

export function ClothingGrid({
  items,
  onItemSelect,
  onItemDelete,
  onAddClick,
  selectedItems = [],
  selectable = false,
  isLoading = false,
}: ClothingGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0 && !onAddClick) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Plus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-1">No items yet</h3>
        <p className="text-muted-foreground text-sm">Start building your wardrobe</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
      {onAddClick && (
        <button
          onClick={onAddClick}
          className="aspect-[3/4] rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors bg-muted/30"
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Add Item</span>
        </button>
      )}
      
      {items.map((item) => (
        <ClothingCard
          key={item.id}
          item={item}
          onSelect={onItemSelect}
          onDelete={onItemDelete}
          selected={selectedItems.includes(item.id)}
          selectable={selectable}
        />
      ))}
    </div>
  );
}