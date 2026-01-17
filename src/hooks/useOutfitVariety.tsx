import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  wear_count: number;
  last_worn_at: string | null;
}

interface Outfit {
  id: string;
  name: string;
  item_ids: string[];
  worn_at: string | null;
  color_palette: string[];
  silhouette: string | null;
  similarity_hash: string | null;
}

// Calculate similarity between two outfits (0-100)
export function calculateSimilarity(
  outfit1ItemIds: string[],
  outfit2ItemIds: string[],
  outfit1Colors: string[],
  outfit2Colors: string[]
): number {
  // Item overlap score (50% weight)
  const set1 = new Set(outfit1ItemIds);
  const set2 = new Set(outfit2ItemIds);
  const intersection = [...set1].filter(id => set2.has(id)).length;
  const union = new Set([...outfit1ItemIds, ...outfit2ItemIds]).size;
  const itemOverlap = union > 0 ? (intersection / union) * 100 : 0;

  // Color similarity score (50% weight)
  const colorSet1 = new Set(outfit1Colors.map(c => c.toLowerCase()));
  const colorSet2 = new Set(outfit2Colors.map(c => c.toLowerCase()));
  const colorIntersection = [...colorSet1].filter(c => colorSet2.has(c)).length;
  const colorUnion = new Set([...outfit1Colors, ...outfit2Colors]).size;
  const colorSimilarity = colorUnion > 0 ? (colorIntersection / colorUnion) * 100 : 0;

  return Math.round((itemOverlap * 0.5) + (colorSimilarity * 0.5));
}

// Generate a hash for quick similarity grouping
export function generateSimilarityHash(itemIds: string[], colors: string[]): string {
  const sortedItems = [...itemIds].sort().slice(0, 3).join('-');
  const sortedColors = [...new Set(colors.map(c => c.toLowerCase()))].sort().slice(0, 3).join('-');
  return `${sortedItems}|${sortedColors}`;
}

// Determine silhouette type based on clothing categories
export function determineSilhouette(categories: string[]): string {
  const hasDress = categories.some(c => c.toLowerCase().includes('dress'));
  const hasSkirt = categories.some(c => c.toLowerCase().includes('skirt'));
  const hasPants = categories.some(c => c.toLowerCase().includes('pants') || c.toLowerCase().includes('jeans') || c.toLowerCase().includes('trousers'));
  const hasShorts = categories.some(c => c.toLowerCase().includes('shorts'));

  if (hasDress) return 'dress';
  if (hasSkirt) return 'skirt';
  if (hasShorts) return 'shorts';
  if (hasPants) return 'pants';
  return 'other';
}

export function useOutfitVariety() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch items with wear data
  const { data: itemsWithWear = [] } = useQuery({
    queryKey: ['items-wear-data', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('clothing_items')
        .select('id, name, category, color, wear_count, last_worn_at')
        .eq('user_id', user.id)
        .order('wear_count', { ascending: false });
      
      if (error) throw error;
      return data as ClothingItem[];
    },
    enabled: !!user,
  });

  // Fetch recent outfits for similarity check
  const { data: recentOutfits = [] } = useQuery({
    queryKey: ['recent-outfits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('outfits')
        .select('id, name, item_ids, worn_at, color_palette, silhouette, similarity_hash')
        .eq('user_id', user.id)
        .not('worn_at', 'is', null)
        .order('worn_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Outfit[];
    },
    enabled: !!user,
  });

  // Mark outfit as worn and update item wear counts
  const markOutfitWorn = useMutation({
    mutationFn: async ({ 
      outfitId, 
      itemIds, 
      colors,
      categories 
    }: { 
      outfitId: string; 
      itemIds: string[]; 
      colors: string[];
      categories: string[];
    }) => {
      const now = new Date().toISOString();
      const silhouette = determineSilhouette(categories);
      const colorPalette = [...new Set(colors.filter(Boolean))];
      const similarityHash = generateSimilarityHash(itemIds, colorPalette);

      // Update outfit with worn timestamp and metadata
      const { error: outfitError } = await supabase
        .from('outfits')
        .update({
          worn_at: now,
          color_palette: colorPalette,
          silhouette,
          similarity_hash: similarityHash,
        })
        .eq('id', outfitId);

      if (outfitError) throw outfitError;

      // Increment wear count for each item
      for (const itemId of itemIds) {
        const { error: itemError } = await supabase
          .from('clothing_items')
          .update({
            wear_count: (itemsWithWear.find(i => i.id === itemId)?.wear_count || 0) + 1,
            last_worn_at: now,
          })
          .eq('id', itemId);

        if (itemError) console.error('Error updating item wear count:', itemError);
      }

      return { outfitId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items-wear-data'] });
      queryClient.invalidateQueries({ queryKey: ['recent-outfits'] });
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast({ title: 'Outfit marked as worn!' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Find similar outfits to a given set of items
  const findSimilarOutfits = (itemIds: string[], colors: string[]): Outfit[] => {
    return recentOutfits
      .map(outfit => ({
        outfit,
        similarity: calculateSimilarity(itemIds, outfit.item_ids, colors, outfit.color_palette || []),
      }))
      .filter(({ similarity }) => similarity > 60)
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ outfit }) => outfit);
  };

  // Get variety score (0-100) - higher is better variety
  const varietyScore = useMemo(() => {
    if (recentOutfits.length < 3) return 100;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < Math.min(recentOutfits.length, 10); i++) {
      for (let j = i + 1; j < Math.min(recentOutfits.length, 10); j++) {
        const similarity = calculateSimilarity(
          recentOutfits[i].item_ids,
          recentOutfits[j].item_ids,
          recentOutfits[i].color_palette || [],
          recentOutfits[j].color_palette || []
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
    return Math.round(100 - avgSimilarity);
  }, [recentOutfits]);

  // Get most and least worn items
  const mostWornItems = useMemo(() => {
    return itemsWithWear
      .filter(item => item.wear_count > 0)
      .slice(0, 5);
  }, [itemsWithWear]);

  const leastWornItems = useMemo(() => {
    return [...itemsWithWear]
      .sort((a, b) => a.wear_count - b.wear_count)
      .slice(0, 5);
  }, [itemsWithWear]);

  // Get items not worn in last 30 days
  const neglectedItems = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return itemsWithWear.filter(item => {
      if (!item.last_worn_at) return true;
      return new Date(item.last_worn_at) < thirtyDaysAgo;
    });
  }, [itemsWithWear]);

  return {
    itemsWithWear,
    recentOutfits,
    varietyScore,
    mostWornItems,
    leastWornItems,
    neglectedItems,
    markOutfitWorn,
    findSimilarOutfits,
    calculateSimilarity,
  };
}
