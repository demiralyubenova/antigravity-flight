/**
 * History Screen - ported from web's pages/History.tsx
 * Shows outfit history with month navigation
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useClothingItems } from '../hooks/useClothingItems';
import { supabase } from '../services/supabase';
import { Outfit, ClothingItem } from '../types';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items: wardrobeItems } = useClothingItems('all');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user.id)
        .not('worn_at', 'is', null)
        .gte('worn_at', startOfMonth.toISOString())
        .lte('worn_at', endOfMonth.toISOString())
        .order('worn_at', { ascending: false });

      if (error) console.error(error);
      setOutfits((data as Outfit[]) || []);
      setLoading(false);
    };
    load();
  }, [user, currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setLoading(true);
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setLoading(true);
  };

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleDelete = (outfit: Outfit) => {
    Alert.alert('Delete outfit?', `Remove "${outfit.name}" from history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('outfits').delete().eq('id', outfit.id);
          setOutfits(prev => prev.filter(o => o.id !== outfit.id));
        },
      },
    ]);
  };

  const getItemsForOutfit = (outfit: Outfit): ClothingItem[] => {
    return outfit.item_ids
      .map(id => wardrobeItems.find(item => item.id === id))
      .filter(Boolean) as ClothingItem[];
  };

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Month Navigation */}
      <View style={[styles.monthNav, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
          <Text style={[styles.navArrowText, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
          <Text style={[styles.navArrowText, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : outfits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No outfits logged for {monthLabel}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground + 'AA' }]}>
              Use "Wear Today" in the Create tab to log outfits
            </Text>
          </View>
        ) : (
          outfits.map(outfit => {
            const items = getItemsForOutfit(outfit);
            const wornDate = outfit.worn_at
              ? new Date(outfit.worn_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : '';

            return (
              <TouchableOpacity
                key={outfit.id}
                style={[styles.outfitCard, { backgroundColor: colors.card }, Shadows.elegant]}
                onLongPress={() => handleDelete(outfit)}
                activeOpacity={0.8}
              >
                <View style={styles.outfitHeader}>
                  <View>
                    <Text style={[styles.outfitName, { color: colors.foreground }]}>{outfit.name}</Text>
                    <Text style={[styles.outfitDate, { color: colors.mutedForeground }]}>
                      📅 {wornDate}
                      {outfit.occasion ? ` • ${outfit.occasion}` : ''}
                    </Text>
                  </View>
                </View>

                {items.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                    {items.map(item => (
                      <View key={item.id} style={styles.thumbContainer}>
                        <Image source={{ uri: item.image_url }} style={styles.thumb} />
                        <Text style={[styles.thumbName, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
    },
    navArrow: { padding: Spacing.sm },
    navArrowText: { fontSize: 28, fontWeight: Typography.fontWeight.light },
    monthText: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
    },
    list: { padding: Spacing.base, gap: Spacing.md },
    emptyContainer: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
    emptyText: { fontSize: Typography.fontSize.sm, textAlign: 'center' },
    emptySubtext: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs },
    outfitCard: {
      borderRadius: BorderRadius.xl,
      padding: Spacing.base,
    },
    outfitHeader: {
      marginBottom: Spacing.md,
    },
    outfitName: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
    outfitDate: {
      fontSize: Typography.fontSize.sm,
      marginTop: 2,
    },
    itemsRow: { marginTop: Spacing.sm },
    thumbContainer: {
      marginRight: Spacing.sm,
      width: 56,
      alignItems: 'center',
    },
    thumb: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.muted,
    },
    thumbName: {
      fontSize: 9,
      marginTop: 4,
      textAlign: 'center',
    },
  });
