/**
 * Wardrobe Screen - ported from web's pages/Wardrobe.tsx
 * Features: category tabs, clothing grid, delete confirmation, ADD ITEM button
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useClothingItems } from '../hooks/useClothingItems';
import { ClothingCategory, ClothingItem, CATEGORY_LABELS, ALL_CATEGORIES } from '../types';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 6;
const NUM_COLUMNS = 3;
const CARD_WIDTH = (width - Spacing.base * 2 - CARD_MARGIN * (NUM_COLUMNS - 1) * 2) / NUM_COLUMNS;

export default function WardrobeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all');
  const { items: allItems, isLoading, deleteItem, refetch } = useClothingItems('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return allItems;
    return allItems.filter(item => item.category === activeCategory);
  }, [allItems, activeCategory]);

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allItems.length };
    ALL_CATEGORIES.forEach(cat => { counts[cat] = 0; });
    allItems.forEach(item => { counts[item.category] = (counts[item.category] || 0) + 1; });
    return counts;
  }, [allItems]);

  const handleDelete = (item: ClothingItem) => {
    Alert.alert(
      'Remove item?',
      `This will permanently remove "${item.name}" from your wardrobe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const styles = createStyles(colors);

  const categories: (ClothingCategory | 'all')[] = ['all', ...ALL_CATEGORIES];

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.card }, Shadows.sm]}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image_url }} style={styles.itemImage} resizeMode="cover" />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.color && (
          <Text style={[styles.itemMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.color}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // "Add" card rendered as the first item in the grid (same as web's ClothingGrid onAddClick)
  const renderAddCard = () => (
    <TouchableOpacity
      style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate('AddItem')}
      activeOpacity={0.7}
    >
      <View style={[styles.addIconCircle, { backgroundColor: colors.primary + '15' }]}>
        <Text style={{ fontSize: 24 }}>+</Text>
      </View>
      <Text style={[styles.addCardText, { color: colors.mutedForeground }]}>Add Item</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.primary : colors.secondary,
                },
              ]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.primaryForeground : colors.secondaryForeground,
                    fontWeight: isActive ? Typography.fontWeight.semibold : Typography.fontWeight.regular,
                  },
                ]}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
              </Text>
              <Text
                style={[
                  styles.tabCount,
                  {
                    color: isActive
                      ? colors.primaryForeground + 'CC'
                      : colors.mutedForeground,
                  },
                ]}
              >
                {itemCounts[cat] || 0}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Clothing Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyIcon]}>👗</Text>
          <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
            {activeCategory === 'all'
              ? 'Your wardrobe is empty'
              : `No ${CATEGORY_LABELS[activeCategory as ClothingCategory]?.toLowerCase()} yet`}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground + 'AA' }]}>
            Tap the + button below to add your first item
          </Text>
          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AddItem')}
          >
            <Text style={[styles.emptyAddBtnText, { color: colors.primaryForeground }]}>
              + Add Your First Item
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderAddCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Floating Add Button (FAB) – always visible when grid has items */}
      {filteredItems.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }, Shadows.elegant]}
          onPress={() => navigation.navigate('AddItem')}
          activeOpacity={0.85}
        >
          <Text style={[styles.fabText, { color: colors.primaryForeground }]}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    tabsContainer: {
      maxHeight: 52,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabsContent: {
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      marginRight: Spacing.sm,
      gap: Spacing.xs,
    },
    tabText: {
      fontSize: Typography.fontSize.sm,
    },
    tabCount: {
      fontSize: Typography.fontSize.xs,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing['2xl'],
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: Spacing.base,
    },
    emptyTitle: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.medium,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: Typography.fontSize.sm,
      textAlign: 'center',
      marginTop: Spacing.xs,
    },
    emptyAddBtn: {
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.xl,
    },
    emptyAddBtnText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
    gridContent: {
      padding: Spacing.base,
    },
    gridRow: {
      gap: CARD_MARGIN * 2,
    },
    itemCard: {
      width: CARD_WIDTH,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      marginBottom: CARD_MARGIN * 2,
    },
    itemImage: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: colors.muted,
    },
    itemInfo: {
      padding: Spacing.sm,
    },
    itemName: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
    },
    itemMeta: {
      fontSize: 10,
      marginTop: 2,
    },
    // Add card (first item in grid)
    addCard: {
      width: CARD_WIDTH,
      aspectRatio: 1,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: CARD_MARGIN * 2,
    },
    addIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    addCardText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
    },
    // FAB
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabText: {
      fontSize: 28,
      fontWeight: Typography.fontWeight.light,
      marginTop: -2,
    },
  });
