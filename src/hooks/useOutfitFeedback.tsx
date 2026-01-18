import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface OutfitFeedback {
  id: string;
  user_id: string;
  outfit_item_ids: string[];
  occasion: string | null;
  rating: 'love' | 'meh' | 'hate' | null;
  temperature_feedback: 'too_warm' | 'just_right' | 'too_cold' | null;
  formality_feedback: 'too_formal' | 'just_right' | 'too_casual' | null;
  more_like_this: boolean;
  notes: string | null;
  created_at: string;
}

export interface FeedbackInput {
  outfit_item_ids: string[];
  occasion?: string;
  rating?: 'love' | 'meh' | 'hate';
  temperature_feedback?: 'too_warm' | 'just_right' | 'too_cold';
  formality_feedback?: 'too_formal' | 'just_right' | 'too_casual';
  more_like_this?: boolean;
  notes?: string;
}

export function useOutfitFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all feedback for the user
  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['outfit-feedback', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('outfit_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OutfitFeedback[];
    },
    enabled: !!user?.id,
  });

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async (input: FeedbackInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('outfit_feedback')
        .insert({
          user_id: user.id,
          outfit_item_ids: input.outfit_item_ids,
          occasion: input.occasion || null,
          rating: input.rating || null,
          temperature_feedback: input.temperature_feedback || null,
          formality_feedback: input.formality_feedback || null,
          more_like_this: input.more_like_this || false,
          notes: input.notes || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfit-feedback'] });
      toast.success('Feedback saved! AI will learn from this.');
    },
    onError: (error) => {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback');
    },
  });

  // Get feedback summary for AI context
  const getFeedbackSummary = () => {
    if (!feedback.length) return null;

    const lovedItems = new Map<string, number>();
    const hatedItems = new Map<string, number>();
    const temperaturePrefs = { too_warm: 0, too_cold: 0 };
    const formalityPrefs = { too_formal: 0, too_casual: 0 };

    feedback.forEach((f) => {
      f.outfit_item_ids.forEach((itemId) => {
        if (f.rating === 'love' || f.more_like_this) {
          lovedItems.set(itemId, (lovedItems.get(itemId) || 0) + 1);
        }
        if (f.rating === 'hate') {
          hatedItems.set(itemId, (hatedItems.get(itemId) || 0) + 1);
        }
      });

      if (f.temperature_feedback === 'too_warm') temperaturePrefs.too_warm++;
      if (f.temperature_feedback === 'too_cold') temperaturePrefs.too_cold++;
      if (f.formality_feedback === 'too_formal') formalityPrefs.too_formal++;
      if (f.formality_feedback === 'too_casual') formalityPrefs.too_casual++;
    });

    return {
      lovedItemIds: Array.from(lovedItems.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id),
      hatedItemIds: Array.from(hatedItems.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id),
      prefersWarmer: temperaturePrefs.too_cold > temperaturePrefs.too_warm,
      prefersCooler: temperaturePrefs.too_warm > temperaturePrefs.too_cold,
      prefersMoreFormal: formalityPrefs.too_casual > formalityPrefs.too_formal,
      prefersMoreCasual: formalityPrefs.too_formal > formalityPrefs.too_casual,
      totalFeedbackCount: feedback.length,
    };
  };

  return {
    feedback,
    isLoading,
    submitFeedback,
    getFeedbackSummary,
  };
}
