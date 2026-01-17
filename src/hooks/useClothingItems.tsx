import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClothingItem, ClothingCategory } from '@/types/wardrobe';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export function useClothingItems(category?: ClothingCategory | 'all') {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['clothing-items', user?.id, category],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('clothing_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClothingItem[];
    },
    enabled: !!user,
  });

  const addItem = useMutation({
    mutationFn: async (item: Omit<ClothingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('clothing_items')
        .insert({
          ...item,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing-items'] });
      toast({ title: 'Item added to your wardrobe' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add item', description: error.message, variant: 'destructive' });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('clothing_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing-items'] });
      toast({ title: 'Item removed from wardrobe' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove item', description: error.message, variant: 'destructive' });
    },
  });

  return {
    items,
    isLoading,
    error,
    addItem,
    deleteItem,
  };
}