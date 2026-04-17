/**
 * Try On Screen - FULL IMPLEMENTATION ported from web's pages/TryOn.tsx
 * Features: photo upload, clothing selection with category/search,
 * virtual try-on via Supabase edge function, saved looks history
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useClothingItems } from '../hooks/useClothingItems';
import { supabase } from '../services/supabase';
import {
  ClothingItem,
  ClothingCategory,
  CATEGORY_LABELS,
  ALL_CATEGORIES,
  SUBCATEGORY_OPTIONS,
  ClothingSubcategory,
} from '../types';

const { width } = Dimensions.get('window');

interface TryOnResult {
  id: string;
  result_image_url: string;
  clothing_item_id: string | null;
  created_at: string;
}

export default function TryOnScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items } = useClothingItems('all');

  const [personImage, setPersonImage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [savedResults, setSavedResults] = useState<TryOnResult[]>([]);

  // Filtering
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<ClothingSubcategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeCategory !== 'all') {
      result = result.filter(item => item.category === activeCategory);
    }
    if (activeSubcategory !== 'all') {
      result = result.filter(item => item.subcategory === activeSubcategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.color?.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [items, activeCategory, activeSubcategory, searchQuery]);

  // Load saved avatar and history
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Load avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.avatar_url) {
        setPersonImage(profile.avatar_url);
      }

      // Load saved try-on results
      const { data: results } = await supabase
        .from('try_on_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (results) setSavedResults(results);
    };
    load();
  }, [user]);

  const pickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission needed', 'Allow access to your photo library to select a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPersonImage(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setPersonImage(asset.uri);
      }
      setTryOnResult(null);
    }
  };

  const takePhoto = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPersonImage(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setPersonImage(asset.uri);
      }
      setTryOnResult(null);
    }
  };

  const toggleItemSelection = (item: ClothingItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) return prev.filter(i => i.id !== item.id);
      if (prev.length >= 4) {
        Alert.alert('Maximum 4 items', 'Remove an item to add another');
        return prev;
      }
      return [...prev, item];
    });
    setTryOnResult(null);
  };

  const handleTryOn = async () => {
    if (!personImage || selectedItems.length === 0) return;

    setProcessing(true);
    try {
      const clothingItems = selectedItems.map(item => ({
        imageUrl: item.image_url,
        type: CATEGORY_LABELS[item.category],
      }));

      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: {
          personImageUrl: personImage,
          clothingItems,
        },
      });

      if (error) throw error;

      if (data.tryOnImageUrl) {
        setTryOnResult(data.tryOnImageUrl);
        Alert.alert('✨ Try-on complete!', 'Your virtual look is ready.');

        // Save to database
        if (user) {
          const { data: saved } = await supabase
            .from('try_on_results')
            .insert({
              user_id: user.id,
              person_image_url: personImage.startsWith('http') ? personImage : '',
              clothing_item_id: selectedItems[0].id,
              result_image_url: data.tryOnImageUrl,
            })
            .select()
            .single();

          if (saved) setSavedResults(prev => [saved, ...prev]);
        }
      }
    } catch (error: any) {
      console.error('Error in virtual try-on:', error);
      Alert.alert('Try-on failed', 'Please try again with a different image.');
    } finally {
      setProcessing(false);
    }
  };

  const deleteSavedResult = async (resultId: string) => {
    await supabase.from('try_on_results').delete().eq('id', resultId);
    setSavedResults(prev => prev.filter(r => r.id !== resultId));
  };

  const viewSavedResult = (result: TryOnResult) => {
    setTryOnResult(result.result_image_url);
    const match = items.find(i => i.id === result.clothing_item_id);
    if (match) setSelectedItems([match]);
  };

  const handleCategoryChange = (cat: ClothingCategory | 'all') => {
    setActiveCategory(cat);
    setActiveSubcategory('all');
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Saved Looks History */}
      {savedResults.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            🕐 Your Saved Looks
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedRow}>
            {savedResults.map(result => (
              <TouchableOpacity
                key={result.id}
                style={[
                  styles.savedThumb,
                  {
                    borderColor: tryOnResult === result.result_image_url ? colors.primary : colors.border,
                    borderWidth: tryOnResult === result.result_image_url ? 2 : 1,
                  },
                ]}
                onPress={() => viewSavedResult(result)}
                onLongPress={() =>
                  Alert.alert('Delete look?', 'Remove this saved look?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteSavedResult(result.id) },
                  ])
                }
              >
                <Image source={{ uri: result.result_image_url }} style={styles.savedThumbImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Your Photo */}
      <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Photo</Text>

        {personImage ? (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: tryOnResult || personImage }}
              style={styles.personPhoto}
              resizeMode="cover"
            />
            {processing && (
              <View style={[styles.processingOverlay, { backgroundColor: colors.background + 'CC' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.processingText, { color: colors.primary }]}>
                  Creating your look...
                </Text>
              </View>
            )}
            {tryOnResult && (
              <View style={[styles.resultBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.resultBadgeText, { color: colors.primary }]}>
                  ✨ Virtual Try-On Result
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.removePhotoBtn, { backgroundColor: colors.destructive }]}
              onPress={() => {
                setPersonImage(null);
                setTryOnResult(null);
              }}
            >
              <Text style={{ color: colors.destructiveForeground, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.muted + '30' }]}>
            <View style={[styles.uploadIcon, { backgroundColor: colors.primary + '15' }]}>
              <Text style={{ fontSize: 32 }}>📸</Text>
            </View>
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Upload Your Photo</Text>
            <Text style={[styles.uploadSubtitle, { color: colors.mutedForeground }]}>
              Take or upload a full-body photo
            </Text>
            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
                onPress={pickImage}
              >
                <Text style={[styles.uploadBtnText, { color: colors.primaryForeground }]}>
                  🖼️ Gallery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: colors.secondary }]}
                onPress={takePhoto}
              >
                <Text style={[styles.uploadBtnText, { color: colors.secondaryForeground }]}>
                  📷 Camera
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Select Outfit */}
      <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
        <View style={styles.outfitHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Outfit</Text>
          {selectedItems.length > 0 && (
            <TouchableOpacity onPress={() => { setSelectedItems([]); setTryOnResult(null); }}>
              <Text style={[styles.clearLink, { color: colors.mutedForeground }]}>
                Clear ({selectedItems.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selected items preview */}
        {selectedItems.length > 0 && (
          <View style={styles.selectedPreview}>
            <Text style={[styles.selectedLabel, { color: colors.mutedForeground }]}>Selected:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.selectedChip, { backgroundColor: colors.secondary }]}
                  onPress={() => toggleItemSelection(item)}
                >
                  <Image source={{ uri: item.image_url }} style={styles.selectedChipImage} />
                  <Text style={[styles.selectedChipText, { color: colors.secondaryForeground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[{ color: colors.mutedForeground, fontSize: 12, marginLeft: 4 }]}>✕</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search */}
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="🔍 Search clothes..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Category tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.catTab, { backgroundColor: activeCategory === 'all' ? colors.primary : colors.secondary }]}
            onPress={() => handleCategoryChange('all')}
          >
            <Text style={[styles.catTabText, { color: activeCategory === 'all' ? colors.primaryForeground : colors.secondaryForeground }]}>All</Text>
          </TouchableOpacity>
          {ALL_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catTab, { backgroundColor: activeCategory === cat ? colors.primary : colors.secondary }]}
              onPress={() => handleCategoryChange(cat)}
            >
              <Text style={[styles.catTabText, { color: activeCategory === cat ? colors.primaryForeground : colors.secondaryForeground }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subcategory tabs */}
        {activeCategory !== 'all' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity
              style={[styles.subTab, { backgroundColor: activeSubcategory === 'all' ? colors.primary + '25' : colors.muted }]}
              onPress={() => setActiveSubcategory('all')}
            >
              <Text style={[styles.subTabText, { color: activeSubcategory === 'all' ? colors.primary : colors.mutedForeground }]}>All</Text>
            </TouchableOpacity>
            {SUBCATEGORY_OPTIONS[activeCategory]?.map(sub => (
              <TouchableOpacity
                key={sub.value}
                style={[styles.subTab, { backgroundColor: activeSubcategory === sub.value ? colors.primary + '25' : colors.muted }]}
                onPress={() => setActiveSubcategory(sub.value)}
              >
                <Text style={[styles.subTabText, { color: activeSubcategory === sub.value ? colors.primary : colors.mutedForeground }]}>
                  {sub.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Clothing grid */}
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {filteredItems.length === 0 ? 'No items found' : `Tap to select (max 4)`}
        </Text>
        <View style={styles.clothingGrid}>
          {filteredItems.map(item => {
            const isSelected = selectedItems.some(i => i.id === item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.clothingThumb,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => toggleItemSelection(item)}
              >
                <Image source={{ uri: item.image_url }} style={styles.clothingThumbImage} />
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: colors.primaryForeground, fontSize: 10, fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Try On Button */}
      {personImage && selectedItems.length > 0 && (
        <TouchableOpacity
          style={[styles.tryOnButton, { backgroundColor: processing ? colors.muted : colors.primary }]}
          onPress={handleTryOn}
          disabled={processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <View style={styles.tryOnRow}>
              <ActivityIndicator color={colors.primaryForeground} />
              <Text style={[styles.tryOnText, { color: colors.primaryForeground }]}>Processing...</Text>
            </View>
          ) : (
            <Text style={[styles.tryOnText, { color: colors.primaryForeground }]}>
              ✨ Try On {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>
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
    sectionLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      letterSpacing: Typography.letterSpacing.tight,
    },
    savedRow: { marginBottom: Spacing.sm },
    savedThumb: {
      width: 64,
      height: 88,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      marginRight: Spacing.sm,
    },
    savedThumbImage: { width: '100%', height: '100%' },
    photoContainer: { marginTop: Spacing.base, alignItems: 'center', position: 'relative' },
    personPhoto: {
      width: width - 80,
      aspectRatio: 3 / 4,
      borderRadius: BorderRadius.xl,
      backgroundColor: colors.muted,
    },
    processingOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
    },
    processingText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    resultBadge: {
      position: 'absolute',
      bottom: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    resultBadgeText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
    },
    removePhotoBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadArea: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      alignItems: 'center',
      marginTop: Spacing.base,
    },
    uploadIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.base,
    },
    uploadTitle: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.medium,
      marginBottom: Spacing.xs,
    },
    uploadSubtitle: {
      fontSize: Typography.fontSize.sm,
      marginBottom: Spacing.base,
    },
    uploadButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    uploadBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.lg,
    },
    uploadBtnText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    outfitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    clearLink: {
      fontSize: Typography.fontSize.sm,
    },
    selectedPreview: { marginBottom: Spacing.md },
    selectedLabel: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
    selectedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
      marginRight: Spacing.sm,
    },
    selectedChipImage: { width: 24, height: 24, borderRadius: 4, marginRight: Spacing.xs },
    selectedChipText: { fontSize: Typography.fontSize.xs, maxWidth: 80 },
    searchInput: {
      height: 40,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
      fontSize: Typography.fontSize.sm,
      borderWidth: 1,
      marginBottom: Spacing.sm,
    },
    categoryScroll: { marginBottom: Spacing.sm },
    catTab: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      marginRight: Spacing.sm,
    },
    catTabText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
    subTab: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      marginRight: Spacing.sm,
    },
    subTabText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
    hint: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
    clothingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    clothingThumb: {
      width: (width - 80 - Spacing.sm * 3) / 4,
      aspectRatio: 1,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
    },
    clothingThumbImage: { width: '100%', height: '100%' },
    checkBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tryOnButton: {
      height: 56,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: Spacing.base,
      marginTop: Spacing.lg,
    },
    tryOnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    tryOnText: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
    },
  });
