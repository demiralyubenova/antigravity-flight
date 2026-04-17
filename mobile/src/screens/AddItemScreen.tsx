/**
 * Add Item Screen - EXACT port of web's AddItemDialog.tsx
 * Flow: Pick photo → AI analysis (auto-fill) → Edit form → Upload to Supabase Storage → Insert row
 * Background removal is skipped on mobile (Python/rembg is backend-only)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useClothingItems } from '../hooks/useClothingItems';
import { supabase } from '../services/supabase';
import {
  ClothingCategory,
  ClothingSubcategory,
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  SUBCATEGORY_OPTIONS,
} from '../types';
import { BackgroundRemover, BackgroundRemoverRef } from '../components/BackgroundRemover';
import { Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AddItemScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { addItem } = useClothingItems('all');

  // Form state – matches web's AddItemDialog exactly
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('tops');
  const [subcategory, setSubcategory] = useState<ClothingSubcategory | ''>('');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [aiDescription, setAiDescription] = useState('');

  // Image state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const bgRemoverRef = useRef<BackgroundRemoverRef>(null);

  // Reset subcategory when category changes (same as web)
  useEffect(() => {
    setSubcategory('');
  }, [category]);

  // ─── Image Picking ───────────────────────────────────────────
  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add clothing photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      handleImage(result.assets[0]);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to photograph clothing items.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      handleImage(result.assets[0]);
    }
  };

  const handleImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setImageUri(asset.uri);
    const b64 = asset.base64
      ? `data:image/jpeg;base64,${asset.base64}`
      : null;
    setImageBase64(b64);

    if (b64) {
      // Run AI tagging and background removal in parallel
      analyzeClothing(b64);
      
      setRemovingBg(true);
      try {
        if (bgRemoverRef.current) {
          const newBgResult = await bgRemoverRef.current.processImage(b64);
          setImageUri(newBgResult);
          setImageBase64(newBgResult);
        }
      } catch (err: any) {
        console.warn('Background removal failed:', err.message);
        Alert.alert('Could not remove background', 'Using original image instead.');
      } finally {
        setRemovingBg(false);
      }
    }
  };

  // ─── AI Analysis (exact same edge function as web) ───────────
  const analyzeClothing = async (base64Image: string) => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-clothing', {
        body: { imageUrl: base64Image },
      });

      if (error) throw error;

      if (data && !data.error) {
        // Auto-fill form fields – identical to web's analyzeClothing()
        if (data.name) setName(data.name);
        if (data.category && ALL_CATEGORIES.includes(data.category as ClothingCategory)) {
          setCategory(data.category as ClothingCategory);
          // Auto-fill subcategory (type) if matches
          if (data.type) {
            const subs = SUBCATEGORY_OPTIONS[data.category as ClothingCategory];
            if (subs) {
              const typeMatch = subs.find(
                (opt: { value: string; label: string }) =>
                  opt.value === data.type.toLowerCase() ||
                  opt.label.toLowerCase() === data.type.toLowerCase()
              );
              if (typeMatch) setSubcategory(typeMatch.value);
            }
          }
        }
        if (data.color) setColor(data.color);
        if (data.brand) setBrand(data.brand);
        if (data.ai_description) setAiDescription(data.ai_description);

        Alert.alert('✨ Item analyzed!', 'Details auto-filled from image');
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Error analyzing clothing:', err);
      Alert.alert('Analysis failed', err.message || 'Could not analyze the clothing item.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Submit (exact same flow as web's handleSubmit) ──────────
  const handleSubmit = async () => {
    if (!imageUri || !name || !user) {
      Alert.alert('Missing fields', 'Please add a photo and name at minimum.');
      return;
    }

    setUploading(true);
    try {
      // Read the image as blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage – same path pattern as web
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('clothing')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Get public URL – same as web
      const { data: { publicUrl } } = supabase.storage
        .from('clothing')
        .getPublicUrl(fileName);

      // Insert into clothing_items – same fields as web
      await addItem({
        name,
        category,
        subcategory: subcategory || undefined,
        image_url: publicUrl,
        color: color || undefined,
        brand: brand || undefined,
        price: price ? parseFloat(price) : undefined,
        ai_description: aiDescription || undefined,
      } as any);

      Alert.alert('✅ Added!', `"${name}" is now in your wardrobe.`);
      navigation.goBack();
    } catch (err: any) {
      console.error('Error adding item:', err);
      Alert.alert('Failed to add item', err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUri(null);
    setImageBase64(null);
    setName('');
    setCategory('tops');
    setSubcategory('');
    setColor('');
    setBrand('');
    setPrice('');
    setAiDescription('');
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo Section */}
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Photo</Text>

          {imageUri ? (
            <View style={styles.previewContainer}>
              <View style={[styles.previewWrapper, { backgroundColor: colors.muted }]}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                {analyzing && (
                  <View style={[styles.analyzingOverlay, { backgroundColor: colors.background + 'CC' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.analyzingText, { color: colors.primary }]}>
                      Analyzing item...
                    </Text>
                  </View>
                )}
                {removingBg && (
                  <View style={[styles.analyzingOverlay, { backgroundColor: colors.background + 'CC' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.analyzingText, { color: colors.primary }]}>
                      Removing background...
                    </Text>
                  </View>
                )}
                {(!analyzing && !removingBg) && (
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
                    onPress={clearImage}
                  >
                    <Text style={{ color: colors.destructiveForeground, fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(!analyzing && !removingBg) && (
                <View style={styles.sparkleRow}>
                  <Sparkles size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.sparkleText, { color: colors.primary }]}>
                    ✨ AI auto-analyzed & mapped
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.muted + '30' }]}>
              <View style={[styles.uploadIconBg, { backgroundColor: colors.primary + '15' }]}>
                <Text style={{ fontSize: 32 }}>📸</Text>
              </View>
              <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Add clothing photo</Text>
              <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>
                AI will auto-detect name, category, color & more
              </Text>
              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
                  onPress={pickFromGallery}
                >
                  <Text style={[styles.uploadBtnText, { color: colors.primaryForeground }]}>🖼️ Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.secondary }]}
                  onPress={pickFromCamera}
                >
                  <Text style={[styles.uploadBtnText, { color: colors.secondaryForeground }]}>📷 Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Form Fields */}
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          {/* Name */}
          <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            placeholder="e.g., White Linen Shirt"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
          />

          {/* Category */}
          <Text style={[styles.label, { color: colors.foreground, marginTop: Spacing.base }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {ALL_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  { backgroundColor: category === cat ? colors.primary : colors.secondary },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: category === cat ? colors.primaryForeground : colors.secondaryForeground },
                  ]}
                >
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Subcategory / Type */}
          <Text style={[styles.label, { color: colors.foreground, marginTop: Spacing.base }]}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: !subcategory ? colors.primary + '25' : colors.muted }]}
              onPress={() => setSubcategory('')}
            >
              <Text style={[styles.chipText, { color: !subcategory ? colors.primary : colors.mutedForeground }]}>
                None
              </Text>
            </TouchableOpacity>
            {SUBCATEGORY_OPTIONS[category]?.map((sub: { value: ClothingSubcategory; label: string }) => (
              <TouchableOpacity
                key={sub.value}
                style={[
                  styles.chip,
                  { backgroundColor: subcategory === sub.value ? colors.primary + '25' : colors.muted },
                ]}
                onPress={() => setSubcategory(sub.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: subcategory === sub.value ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {sub.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color, Brand, Price – 3-column row matching web */}
          <View style={[styles.triRow, { marginTop: Spacing.base }]}>
            <View style={styles.triCol}>
              <Text style={[styles.smallLabel, { color: colors.foreground }]}>Color</Text>
              <TextInput
                style={[styles.smallInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                placeholder="White"
                placeholderTextColor={colors.mutedForeground}
                value={color}
                onChangeText={setColor}
              />
            </View>
            <View style={styles.triCol}>
              <Text style={[styles.smallLabel, { color: colors.foreground }]}>Brand</Text>
              <TextInput
                style={[styles.smallInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Zara"
                placeholderTextColor={colors.mutedForeground}
                value={brand}
                onChangeText={setBrand}
              />
            </View>
            <View style={styles.triCol}>
              <Text style={[styles.smallLabel, { color: colors.foreground }]}>Price</Text>
              <TextInput
                style={[styles.smallInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                placeholder="$49"
                placeholderTextColor={colors.mutedForeground}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* AI Description (read-only) */}
          {aiDescription ? (
            <View style={[styles.aiDescBox, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
              <Text style={[styles.aiDescLabel, { color: colors.primary }]}>✨ AI Description</Text>
              <Text style={[styles.aiDescText, { color: colors.mutedForeground }]}>{aiDescription}</Text>
            </View>
          ) : null}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: (!imageUri || !name || uploading || analyzing) ? colors.muted : colors.primary,
            },
          ]}
          onPress={handleSubmit}
          disabled={!imageUri || !name || uploading || analyzing}
          activeOpacity={0.8}
        >
          {uploading ? (
            <View style={styles.submitRow}>
              <ActivityIndicator color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Uploading...</Text>
            </View>
          ) : (
            <Text style={[styles.submitText, { color: (!imageUri || !name) ? colors.mutedForeground : colors.primaryForeground }]}>
              Add to Wardrobe
            </Text>
          )}
        </TouchableOpacity>

        {/* Include Hidden WebView for Background Removal */}
        <BackgroundRemover ref={bgRemoverRef} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 20 },
    card: {
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.base,
      marginTop: Spacing.base,
      padding: Spacing.lg,
    },
    label: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      marginBottom: Spacing.sm,
    },
    input: {
      height: 48,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.base,
      fontSize: Typography.fontSize.base,
      borderWidth: 1,
    },
    chipRow: { marginBottom: Spacing.xs },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      marginRight: Spacing.sm,
    },
    chipText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
    },
    triRow: { flexDirection: 'row', gap: Spacing.sm },
    triCol: { flex: 1 },
    smallLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
      marginBottom: 4,
    },
    smallInput: {
      height: 40,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.sm,
      fontSize: Typography.fontSize.sm,
      borderWidth: 1,
    },
    // Image upload
    uploadArea: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      alignItems: 'center',
    },
    uploadIconBg: {
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
    uploadHint: {
      fontSize: Typography.fontSize.sm,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    uploadButtons: { flexDirection: 'row', gap: Spacing.md },
    uploadBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.lg,
    },
    uploadBtnText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    // Preview
    previewContainer: { alignItems: 'center' },
    previewWrapper: {
      width: width * 0.5,
      aspectRatio: 3 / 4,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      position: 'relative',
    },
    previewImage: { width: '100%', height: '100%', backgroundColor: '#fff' },
    analyzingOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    analyzingText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    removeBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sparkleRow: { marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
    sparkleText: { fontSize: Typography.fontSize.xs },
    // AI description
    aiDescBox: {
      marginTop: Spacing.base,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      padding: Spacing.md,
    },
    aiDescLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      marginBottom: 4,
    },
    aiDescText: {
      fontSize: Typography.fontSize.sm,
      lineHeight: 18,
    },
    // Submit
    submitBtn: {
      height: 52,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: Spacing.base,
      marginTop: Spacing.lg,
    },
    submitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    submitText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
  });
