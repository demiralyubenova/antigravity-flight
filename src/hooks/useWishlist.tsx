import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  target_price: number | null;
  priority: 'low' | 'medium' | 'high';
  source: string | null;
  related_outfit_id: string | null;
  is_purchased: boolean;
  created_at: string;
  updated_at: string;
}

export function useWishlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['wishlist-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WishlistItem[];
    },
    enabled: !!user,
  });

  const addItem = useMutation({
    mutationFn: async (item: Omit<WishlistItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_purchased'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('wishlist_items')
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
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      toast({ title: 'Added to wishlist!' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add item', description: error.message, variant: 'destructive' });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WishlistItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update item', description: error.message, variant: 'destructive' });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      toast({ title: 'Removed from wishlist' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove item', description: error.message, variant: 'destructive' });
    },
  });

  const markPurchased = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .update({ is_purchased: true })
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      toast({ title: '🎉 Item purchased!' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update item', description: error.message, variant: 'destructive' });
    },
  });

  const pendingItems = items.filter(item => !item.is_purchased);
  const purchasedItems = items.filter(item => item.is_purchased);

  return {
    items,
    pendingItems,
    purchasedItems,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    markPurchased,
  };
}
