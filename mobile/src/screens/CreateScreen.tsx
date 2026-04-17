/**
 * Create Screen - ported from web's pages/Create.tsx
 * AI outfit generator with occasion input and suggestions
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useClothingItems } from '../hooks/useClothingItems';
import { supabase } from '../services/supabase';
import { OCCASION_SUGGESTIONS } from '../constants';
import { ClothingItem, OutfitSuggestion } from '../types';

export default function CreateScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items: wardrobeItems } = useClothingItems('all');
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [insufficient, setInsufficient] = useState<{ insufficient: boolean; missingItems: string[] } | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!occasion.trim()) {
      Alert.alert('Enter an occasion', 'Tell me where you\'re going!');
      return;
    }
    if (wardrobeItems.length === 0) {
      Alert.alert('Empty wardrobe', 'Add some items to your wardrobe first');
      return;
    }

    setLoading(true);
    setInsufficient(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-outfits', {
        body: {
          occasion,
          wardrobeItems: wardrobeItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            color: item.color,
            brand: item.brand,
          })),
          recentOutfits: [],
          userFeedback: null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.insufficient) {
        setInsufficient({ insufficient: true, missingItems: data.missingItems || [] });
        return;
      }

      if (data.outfits && Array.isArray(data.outfits)) {
        const withItems = data.outfits.map((outfit: OutfitSuggestion) => ({
          ...outfit,
          items: outfit.itemIds
            .map((id: string) => wardrobeItems.find(item => item.id === id))
            .filter(Boolean) as ClothingItem[],
        }));
        setOutfits(withItems);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate outfits');
    } finally {
      setLoading(false);
    }
  };

  const handleWearToday = async (index: number) => {
    const outfit = outfits[index];
    if (!user || !outfit.items?.length) return;

    setSavingIndex(index);
    try {
      const { error } = await supabase.from('outfits').insert({
        user_id: user.id,
        name: outfit.name,
        item_ids: outfit.itemIds,
        occasion: occasion || null,
        worn_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSavedSet(prev => new Set([...prev, index]));
      Alert.alert('✅ Outfit logged!', 'Added to your history');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSavingIndex(null);
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Occasion Input */}
      <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>What's the occasion?</Text>
        <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
          Tell me where you're going and I'll create 3 outfit options
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.input,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
            placeholder="e.g., Business meeting, date night..."
            placeholderTextColor={colors.mutedForeground}
            value={occasion}
            onChangeText={setOccasion}
            onSubmitEditing={handleGenerate}
            returnKeyType="go"
          />
        </View>

        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: colors.primary }]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.generateText, { color: colors.primaryForeground }]}>
              ✨ Create Outfits
            </Text>
          )}
        </TouchableOpacity>

        {/* Quick Occasion Chips */}
        <View style={styles.chipsContainer}>
          {OCCASION_SUGGESTIONS.map(suggestion => (
            <TouchableOpacity
              key={suggestion}
              style={[
                styles.chip,
                {
                  backgroundColor: occasion === suggestion ? colors.primary : colors.secondary,
                },
              ]}
              onPress={() => setOccasion(suggestion)}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: occasion === suggestion ? colors.primaryForeground : colors.secondaryForeground,
                  },
                ]}
              >
                {suggestion}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.primary }]}>
              Creating your perfect outfits...
            </Text>
          </View>
        </View>
      )}

      {/* Insufficient Wardrobe Warning */}
      {insufficient?.insufficient && (
        <View style={[styles.card, { backgroundColor: colors.destructive + '08' }, Shadows.elegant]}>
          <Text style={[styles.warningTitle, { color: colors.foreground }]}>
            ⚠️ Your wardrobe needs more items
          </Text>
          <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
            You don't have enough suitable items for "{occasion}"
          </Text>
          {insufficient.missingItems.length > 0 && (
            <View style={styles.missingList}>
              <Text style={[styles.missingLabel, { color: colors.foreground }]}>
                Suggested items to add:
              </Text>
              {insufficient.missingItems.map((item, i) => (
                <Text key={i} style={[styles.missingItem, { color: colors.mutedForeground }]}>
                  🛍️ {item}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Outfit Suggestions */}
      {outfits.map((outfit, index) => (
        <View key={index} style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={styles.outfitHeader}>
            <View style={[styles.outfitNumber, { backgroundColor: colors.primary }]}>
              <Text style={[styles.outfitNumberText, { color: colors.primaryForeground }]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.outfitTitleGroup}>
              <Text style={[styles.outfitName, { color: colors.foreground }]}>{outfit.name}</Text>
              <Text style={[styles.outfitDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {outfit.description}
              </Text>
            </View>
          </View>

          {/* Items Grid */}
          <View style={styles.itemsGrid}>
            {outfit.items?.map(item => (
              <View key={item.id} style={styles.outfitItem}>
                <Image source={{ uri: item.image_url }} style={styles.outfitItemImage} />
                <Text style={[styles.outfitItemName, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: savedSet.has(index) ? colors.secondary : colors.primary,
                },
              ]}
              onPress={() => handleWearToday(index)}
              disabled={savingIndex !== null || savedSet.has(index)}
            >
              {savingIndex === index ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: savedSet.has(index) ? colors.secondaryForeground : colors.primaryForeground,
                    },
                  ]}
                >
                  {savedSet.has(index) ? '✓ Logged!' : '✓ Wear Today'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Empty State */}
      {!loading && outfits.length === 0 && !insufficient && (
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Enter an occasion above to get AI-curated outfit suggestions
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground + 'AA' }]}>
              Based on your {wardrobeItems.length} wardrobe items
            </Text>
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
    card: {
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.base,
      marginTop: Spacing.base,
      padding: Spacing.lg,
    },
    cardTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      letterSpacing: Typography.letterSpacing.tight,
      textAlign: 'center',
    },
    cardSubtitle: {
      fontSize: Typography.fontSize.sm,
      textAlign: 'center',
      marginTop: Spacing.xs,
      marginBottom: Spacing.base,
    },
    inputRow: { marginBottom: Spacing.md },
    input: {
      height: 48,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.base,
      fontSize: Typography.fontSize.base,
      borderWidth: 1,
    },
    generateButton: {
      height: 48,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.base,
    },
    generateText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      justifyContent: 'center',
    },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
    },
    chipText: { fontSize: Typography.fontSize.sm },
    loadingContent: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      gap: Spacing.base,
    },
    loadingText: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.medium,
    },
    warningTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      marginBottom: Spacing.xs,
    },
    warningText: { fontSize: Typography.fontSize.sm },
    missingList: { marginTop: Spacing.md },
    missingLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      marginBottom: Spacing.sm,
    },
    missingItem: {
      fontSize: Typography.fontSize.sm,
      marginBottom: Spacing.xs,
    },
    outfitHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginBottom: Spacing.base,
    },
    outfitNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    outfitNumberText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    outfitTitleGroup: { flex: 1 },
    outfitName: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      letterSpacing: Typography.letterSpacing.tight,
    },
    outfitDesc: {
      fontSize: Typography.fontSize.sm,
      marginTop: 2,
    },
    itemsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.base,
    },
    outfitItem: {
      width: 72,
      alignItems: 'center',
    },
    outfitItemImage: {
      width: 64,
      height: 64,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.muted,
    },
    outfitItemName: {
      fontSize: 10,
      marginTop: 4,
      textAlign: 'center',
    },
    actionRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    actionButton: {
      flex: 1,
      height: 40,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
    },
    emptyContent: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
    },
    emptyIcon: { fontSize: 40, marginBottom: Spacing.base },
    emptyText: {
      fontSize: Typography.fontSize.sm,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: Typography.fontSize.xs,
      textAlign: 'center',
      marginTop: Spacing.xs,
    },
  });
