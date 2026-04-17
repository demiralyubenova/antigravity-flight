/**
 * Insights Screen - ported from web's pages/Insights.tsx
 * Wardrobe analytics: stats grid, category breakdown, color palette, most/least worn
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useClothingItems } from '../hooks/useClothingItems';
import { supabase } from '../services/supabase';
import { CATEGORY_LABELS, ClothingCategory } from '../types';
import { COLOR_MAP } from '../constants';

interface Outfit {
  id: string;
  item_ids: string[];
  worn_at: string | null;
  is_planned: boolean;
}

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items: clothingItems } = useClothingItems('all');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('outfits')
        .select('id, item_ids, worn_at, is_planned')
        .eq('user_id', user.id)
        .eq('is_planned', false);
      setOutfits(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const itemWearCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    clothingItems.forEach(item => { counts[item.id] = 0; });
    outfits.forEach(outfit => {
      if (!outfit.worn_at) return;
      outfit.item_ids.forEach(id => {
        if (counts[id] !== undefined) counts[id]++;
      });
    });
    return counts;
  }, [clothingItems, outfits]);

  const totalWears = outfits.length;

  const unusedCount = useMemo(() =>
    clothingItems.filter(item => (itemWearCounts[item.id] || 0) === 0).length,
    [clothingItems, itemWearCounts]
  );

  const mostWorn = useMemo(() =>
    [...clothingItems]
      .filter(item => (itemWearCounts[item.id] || 0) > 0)
      .sort((a, b) => (itemWearCounts[b.id] || 0) - (itemWearCounts[a.id] || 0))
      .slice(0, 5),
    [clothingItems, itemWearCounts]
  );

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    clothingItems.forEach(item => {
      cats[item.category] = (cats[item.category] || 0) + 1;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [clothingItems]);

  const colorBreakdown = useMemo(() => {
    const c: Record<string, number> = {};
    clothingItems.forEach(item => {
      const color = item.color || 'Unknown';
      c[color] = (c[color] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [clothingItems]);

  const brandBreakdown = useMemo(() => {
    const b: Record<string, number> = {};
    clothingItems.forEach(item => {
      const brand = item.brand || 'Unbranded';
      b[brand] = (b[brand] || 0) + 1;
    });
    return Object.entries(b).sort((a, b) => b[1] - a[1]).filter(([n]) => n !== 'Unbranded').slice(0, 6);
  }, [clothingItems]);

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Text>👗</Text>
          </View>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>{clothingItems.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Items</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={[styles.statIcon, { backgroundColor: '#22c55e20' }]}>
            <Text>📈</Text>
          </View>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>{totalWears}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Wears</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={[styles.statIcon, { backgroundColor: '#ef444420' }]}>
            <Text>⚠️</Text>
          </View>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>{unusedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Never Worn</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={[styles.statIcon, { backgroundColor: '#eab30820' }]}>
            <Text>💰</Text>
          </View>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>—</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Value</Text>
        </View>
      </View>

      {/* Most Worn */}
      {mostWorn.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card }, Shadows.elegant]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>⭐ Most Worn</Text>
          {mostWorn.map((item, i) => (
            <View key={item.id} style={styles.rankRow}>
              <View style={[styles.rankBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.rankText, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <Image source={{ uri: item.image_url }} style={styles.rankImage} />
              <Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.rankCount, { color: colors.foreground }]}>
                {itemWearCounts[item.id]}×
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Category Breakdown */}
      <View style={[styles.section, { backgroundColor: colors.card }, Shadows.elegant]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📦 By Category</Text>
        {categoryBreakdown.map(([cat, count]) => (
          <View key={cat} style={styles.barRow}>
            <Text style={[styles.barLabel, { color: colors.foreground }]}>
              {CATEGORY_LABELS[cat as ClothingCategory] || cat}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${(count / clothingItems.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barCount, { color: colors.mutedForeground }]}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Color Palette */}
      {colorBreakdown.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card }, Shadows.elegant]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🎨 Color Palette</Text>
          <View style={styles.colorGrid}>
            {colorBreakdown.map(([color, count]) => (
              <View key={color} style={[styles.colorChip, { backgroundColor: colors.secondary + '80' }]}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: COLOR_MAP[color] || '#9ca3af', borderColor: colors.border },
                  ]}
                />
                <Text style={[styles.colorName, { color: colors.foreground }]}>{color}</Text>
                <Text style={[styles.colorCount, { color: colors.mutedForeground }]}>({count})</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Brands */}
      {brandBreakdown.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card }, Shadows.elegant]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🏷️ Top Brands</Text>
          <View style={styles.colorGrid}>
            {brandBreakdown.map(([brand, count]) => (
              <View key={brand} style={[styles.colorChip, { backgroundColor: colors.secondary + '80' }]}>
                <Text style={[styles.colorName, { color: colors.foreground }]}>{brand}</Text>
                <Text style={[styles.colorCount, { color: colors.mutedForeground }]}>({count})</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: Spacing.base,
      gap: Spacing.md,
    },
    statCard: {
      width: '47%',
      borderRadius: BorderRadius.xl,
      padding: Spacing.base,
      alignItems: 'center',
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    statNumber: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
    },
    statLabel: {
      fontSize: Typography.fontSize.xs,
      marginTop: 2,
    },
    section: {
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.base,
      marginTop: Spacing.base,
      padding: Spacing.lg,
    },
    sectionTitle: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.semibold,
      marginBottom: Spacing.base,
    },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    rankBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    rankImage: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.muted,
    },
    rankName: {
      flex: 1,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    rankCount: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    barLabel: {
      width: 80,
      fontSize: Typography.fontSize.sm,
    },
    barTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.muted,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 4,
    },
    barCount: {
      width: 24,
      fontSize: Typography.fontSize.sm,
      textAlign: 'right',
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    colorChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
    },
    colorDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
    },
    colorName: { fontSize: Typography.fontSize.sm },
    colorCount: { fontSize: Typography.fontSize.xs },
  });
