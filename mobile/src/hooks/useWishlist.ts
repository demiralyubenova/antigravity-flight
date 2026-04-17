/**
 * Wishlist hook - ported from web app's src/hooks/useWishlist.tsx
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { WishlistItem } from '../types';

export function useWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as WishlistItem[]) || []);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (
    item: Omit<WishlistItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_purchased'>
  ) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({ ...item, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    await fetchItems();
    return data;
  }, [user, fetchItems]);

  const deleteItem = useCallback(async (itemId: string) => {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    await fetchItems();
  }, [fetchItems]);

  const markPurchased = useCallback(async (itemId: string) => {
    const { error } = await supabase
      .from('wishlist_items')
      .update({ is_purchased: true })
      .eq('id', itemId);

    if (error) throw error;
    await fetchItems();
  }, [fetchItems]);

  const pendingItems = useMemo(() => items.filter(i => !i.is_purchased), [items]);
  const purchasedItems = useMemo(() => items.filter(i => i.is_purchased), [items]);

  return { items, pendingItems, purchasedItems, isLoading, addItem, deleteItem, markPurchased, refetch: fetchItems };
}
