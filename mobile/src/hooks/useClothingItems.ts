/**
 * Clothing items hook - ported from web app's src/hooks/useClothingItems.tsx
 * Uses direct Supabase queries (same as web) instead of React Query for simplicity
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { ClothingItem, ClothingCategory } from '../types';
import { useAuth } from './useAuth';

export function useClothingItems(category?: ClothingCategory | 'all') {
  const { user } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('clothing_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setItems((data as ClothingItem[]) || []);
    } catch (err: any) {
      setError(err);
      console.error('Error fetching clothing items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, category]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (item: Omit<ClothingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('clothing_items')
      .insert({ ...item, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    await fetchItems();
    return data;
  }, [user, fetchItems]);

  const deleteItem = useCallback(async (itemId: string) => {
    const { error } = await supabase
      .from('clothing_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    await fetchItems();
  }, [fetchItems]);

  return { items, isLoading, error, addItem, deleteItem, refetch: fetchItems };
}
