/**
 * Wishlist Screen - ported from web's pages/Wishlist.tsx
 * Tabs for wanted/purchased items with add, delete, mark-purchased
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
  Modal,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useWishlist } from '../hooks/useWishlist';
import { WishlistItem } from '../types';
import { WISHLIST_CATEGORIES, PRIORITY_OPTIONS } from '../constants';

export default function WishlistScreen() {
  const { colors } = useTheme();
  const { pendingItems, purchasedItems, isLoading, addItem, deleteItem, markPurchased } = useWishlist();
  const [activeTab, setActiveTab] = useState<'wanted' | 'purchased'>('wanted');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Tops',
    description: '',
    target_price: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newItem.name.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    setSaving(true);
    try {
      await addItem({
        name: newItem.name,
        category: newItem.category,
        description: newItem.description || null,
        target_price: newItem.target_price ? parseFloat(newItem.target_price) : null,
        priority: newItem.priority,
        source: 'manual',
        image_url: null,
        related_outfit_id: null,
      });
      setNewItem({ name: '', category: 'Tops', description: '', target_price: '', priority: 'medium' });
      setShowAdd(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: WishlistItem) => {
    Alert.alert('Remove?', `Remove "${item.name}" from wishlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItem(item.id) },
    ]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.destructive;
      case 'medium': return colors.primary;
      default: return colors.mutedForeground;
    }
  };

  const styles = createStyles(colors);

  const items = activeTab === 'wanted' ? pendingItems : purchasedItems;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>
          + Add to Wishlist
        </Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wanted' && { backgroundColor: colors.card }]}
          onPress={() => setActiveTab('wanted')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'wanted' ? colors.foreground : colors.mutedForeground }]}>
            ❤️ Wanted ({pendingItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'purchased' && { backgroundColor: colors.card }]}
          onPress={() => setActiveTab('purchased')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'purchased' ? colors.foreground : colors.mutedForeground }]}>
            ✓ Got It ({purchasedItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <ScrollView contentContainerStyle={styles.list}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{activeTab === 'wanted' ? '🛍️' : '✓'}</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTab === 'wanted' ? 'Your wishlist is empty' : 'No purchased items yet'}
            </Text>
          </View>
        ) : (
          items.map(item => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card }, Shadows.elegant]}>
              <View style={styles.itemRow}>
                {item.image_url && (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                )}
                <View style={styles.itemInfo}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.priorityBadge, { borderColor: getPriorityColor(item.priority) + '40', backgroundColor: getPriorityColor(item.priority) + '15' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                        {item.priority}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                    🏷️ {item.category}
                    {item.target_price ? ` • 💰 $${item.target_price}` : ''}
                  </Text>
                  {item.description && (
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>

              {activeTab === 'wanted' && (
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.primary }]}
                    onPress={() => markPurchased(item.id)}
                  >
                    <Text style={[styles.smallButtonText, { color: colors.primaryForeground }]}>✓ Got It</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.muted }]}
                    onPress={() => handleDelete(item)}
                  >
                    <Text style={[styles.smallButtonText, { color: colors.destructive }]}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add to Wishlist</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={[styles.closeButton, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Item name (e.g., Black leather jacket)"
              placeholderTextColor={colors.mutedForeground}
              value={newItem.name}
              onChangeText={t => setNewItem(p => ({ ...p, name: t }))}
            />

            {/* Category selector */}
            <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {WISHLIST_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, { backgroundColor: newItem.category === cat ? colors.primary : colors.secondary }]}
                  onPress={() => setNewItem(p => ({ ...p, category: cat }))}
                >
                  <Text style={{ color: newItem.category === cat ? colors.primaryForeground : colors.secondaryForeground, fontSize: Typography.fontSize.sm }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={newItem.description}
              onChangeText={t => setNewItem(p => ({ ...p, description: t }))}
              multiline
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Max budget ($)"
                placeholderTextColor={colors.mutedForeground}
                value={newItem.target_price}
                onChangeText={t => setNewItem(p => ({ ...p, target_price: t }))}
                keyboardType="numeric"
              />
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.priorityOption,
                    {
                      backgroundColor: newItem.priority === opt.value ? colors.primary : colors.secondary,
                      borderColor: newItem.priority === opt.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewItem(p => ({ ...p, priority: opt.value }))}
                >
                  <Text style={{
                    color: newItem.priority === opt.value ? colors.primaryForeground : colors.secondaryForeground,
                    fontWeight: Typography.fontWeight.medium,
                    fontSize: Typography.fontSize.sm,
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Add to Wishlist</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, padding: Spacing.base },
    addButton: {
      height: 48,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.base,
    },
    addButtonText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    tabBar: {
      flexDirection: 'row',
      borderRadius: BorderRadius.lg,
      padding: 4,
      marginBottom: Spacing.base,
    },
    tab: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    tabText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    list: { paddingBottom: 40, gap: Spacing.md },
    emptyContainer: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
    emptyText: { fontSize: Typography.fontSize.sm, textAlign: 'center' },
    itemCard: {
      borderRadius: BorderRadius.xl,
      padding: Spacing.base,
    },
    itemRow: { flexDirection: 'row', gap: Spacing.md },
    itemImage: {
      width: 64,
      height: 64,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.muted,
    },
    itemInfo: { flex: 1 },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    itemName: { flex: 1, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
    priorityBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
    },
    priorityText: { fontSize: 10, fontWeight: Typography.fontWeight.medium },
    itemMeta: { fontSize: Typography.fontSize.sm, marginTop: 4 },
    itemDesc: { fontSize: Typography.fontSize.sm, marginTop: 4 },
    itemActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    smallButton: {
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.lg,
    },
    smallButtonText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    modalContainer: { flex: 1 },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold },
    closeButton: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
    modalBody: { padding: Spacing.lg, gap: Spacing.base },
    input: {
      height: 48,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.base,
      fontSize: Typography.fontSize.base,
      borderWidth: 1,
    },
    multiline: { height: 80, paddingTop: Spacing.md, textAlignVertical: 'top' },
    label: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, marginTop: Spacing.sm },
    chipScroll: { marginVertical: Spacing.sm },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      marginRight: Spacing.sm,
    },
    row: { flexDirection: 'row', gap: Spacing.md },
    priorityRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
    priorityOption: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
    },
    submitButton: {
      height: 48,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.base,
    },
    submitText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
  });
