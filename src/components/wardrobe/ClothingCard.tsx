import { Trash2 } from 'lucide-react';
import { ClothingItem } from '@/types/wardrobe';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ClothingCardProps {
  item: ClothingItem;
  onSelect?: (item: ClothingItem) => void;
  onDelete?: (item: ClothingItem) => void;
  selected?: boolean;
  selectable?: boolean;
}

export function ClothingCard({ 
  item, 
  onSelect, 
  onDelete, 
  selected = false,
  selectable = false 
}: ClothingCardProps) {
  return (
    <div 
      onClick={() => selectable && onSelect?.(item)}
      className={cn(
        'group relative aspect-[3/4] rounded-lg overflow-hidden bg-muted animate-fade-in',
        selectable && 'cursor-pointer',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <img
        src={item.image_url}
        alt={item.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Item info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
        <p className="text-sm font-medium text-primary-foreground truncate">{item.name}</p>
        {item.brand && (
          <p className="text-xs text-primary-foreground/70 truncate">{item.brand}</p>
        )}
      </div>

      {/* Delete button */}
      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
          <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}