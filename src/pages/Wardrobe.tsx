import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CategoryTabs } from '@/components/wardrobe/CategoryTabs';
import { ClothingGrid } from '@/components/wardrobe/ClothingGrid';
import { AddItemDialog } from '@/components/wardrobe/AddItemDialog';
import { useClothingItems } from '@/hooks/useClothingItems';
import { ClothingCategory } from '@/types/wardrobe';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClothingItem } from '@/types/wardrobe';

export default function Wardrobe() {
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ClothingItem | null>(null);
  
  // Get all items for counting
  const { items: allItems } = useClothingItems('all');
  
  // Get filtered items based on active category
  const { items, isLoading, addItem, deleteItem } = useClothingItems(activeCategory);

  // Calculate item counts for each category
  const itemCounts = useMemo(() => {
    const counts: Record<ClothingCategory | 'all', number> = {
      all: allItems.length,
      tops: 0,
      bottoms: 0,
      outerwear: 0,
      shoes: 0,
      accessories: 0,
      dresses: 0,
    };
    
    allItems.forEach((item) => {
      counts[item.category]++;
    });
    
    return counts;
  }, [allItems]);

  const handleAddItem = (item: {
    name: string;
    category: ClothingCategory;
    image_url: string;
    color?: string;
    brand?: string;
  }) => {
    addItem.mutate(item);
  };

  const handleDeleteItem = (item: ClothingItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem.mutate(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <AppLayout title="My Wardrobe" subtitle="Your digital closet">
      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        itemCounts={itemCounts}
      />

      <ClothingGrid
        items={items}
        onItemDelete={handleDeleteItem}
        onAddClick={() => setAddDialogOpen(true)}
        isLoading={isLoading}
      />

      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddItem}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{itemToDelete?.name}" from your wardrobe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}