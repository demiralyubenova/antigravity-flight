/**
 * Travel Screen - FULL IMPLEMENTATION ported from web's pages/Travel.tsx
 * Features: create trips, daily outfit assignment, packing list, delete trips
 */
import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useClothingItems } from '../hooks/useClothingItems';
import { supabase } from '../services/supabase';
import { ClothingItem, CATEGORY_LABELS, ClothingCategory } from '../types';

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
}

interface TripOutfit {
  id: string;
  trip_id: string;
  outfit_id: string | null;
  planned_date: string;
  notes: string | null;
}

interface Outfit {
  id: string;
  name: string;
  item_ids: string[];
  occasion: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function eachDayOfInterval(start: string, end: string): string[] {
  const days: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function diffDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function TravelScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items: clothingItems } = useClothingItems('all');

  const [trips, setTrips] = useState<Trip[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  // Create trip state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [saving, setSaving] = useState(false);

  // Trip details state
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripOutfits, setTripOutfits] = useState<TripOutfit[]>([]);

  // Add outfit to day
  const [showOutfitPicker, setShowOutfitPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Load trips and outfits
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [tripsRes, outfitsRes] = await Promise.all([
        supabase.from('trips').select('*').eq('user_id', user.id).order('start_date', { ascending: true }),
        supabase.from('outfits').select('id, name, item_ids, occasion').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setTrips(tripsRes.data || []);
      setOutfits(outfitsRes.data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  // Load trip outfits when selected
  useEffect(() => {
    if (!selectedTrip) { setTripOutfits([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from('trip_outfits')
        .select('*')
        .eq('trip_id', selectedTrip.id)
        .order('planned_date', { ascending: true });
      setTripOutfits(data || []);
    };
    load();
  }, [selectedTrip]);

  const createTrip = async () => {
    if (!user || !newName || !newStart || !newEnd) {
      Alert.alert('Missing fields', 'Please fill in the trip name and dates (YYYY-MM-DD).');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: newName,
          destination: newDest || null,
          start_date: newStart,
          end_date: newEnd,
        })
        .select()
        .single();
      if (error) throw error;
      setTrips(prev => [...prev, data].sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ));
      setShowCreate(false);
      setNewName(''); setNewDest(''); setNewStart(''); setNewEnd('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTrip = async (tripId: string) => {
    Alert.alert('Delete trip?', 'This will permanently remove this trip and all its outfit plans.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('trips').delete().eq('id', tripId);
          setTrips(prev => prev.filter(t => t.id !== tripId));
          if (selectedTrip?.id === tripId) setSelectedTrip(null);
        },
      },
    ]);
  };

  const addOutfitToDay = async (outfitId: string) => {
    if (!selectedTrip || !selectedDay) return;
    try {
      const { data, error } = await supabase
        .from('trip_outfits')
        .insert({
          trip_id: selectedTrip.id,
          outfit_id: outfitId,
          planned_date: selectedDay,
        })
        .select()
        .single();
      if (error) throw error;
      setTripOutfits(prev => [...prev, data].sort((a, b) =>
        new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime()
      ));
      setShowOutfitPicker(false);
      setSelectedDay(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const removeTripOutfit = async (toId: string) => {
    await supabase.from('trip_outfits').delete().eq('id', toId);
    setTripOutfits(prev => prev.filter(to => to.id !== toId));
  };

  // Packing list
  const packingList = useMemo(() => {
    const itemSet = new Set<string>();
    tripOutfits.forEach(to => {
      const outfit = outfits.find(o => o.id === to.outfit_id);
      if (outfit) outfit.item_ids.forEach(id => itemSet.add(id));
    });
    return Array.from(itemSet)
      .map(id => clothingItems.find(item => item.id === id))
      .filter(Boolean) as ClothingItem[];
  }, [tripOutfits, outfits, clothingItems]);

  const packingByCategory = useMemo(() => {
    const grouped: Record<string, ClothingItem[]> = {};
    packingList.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [packingList]);

  const upcomingTrips = trips.filter(t => new Date(t.end_date) >= new Date());
  const pastTrips = trips.filter(t => new Date(t.end_date) < new Date());

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Trip details view
  if (selectedTrip) {
    const days = eachDayOfInterval(selectedTrip.start_date, selectedTrip.end_date);

    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailTitle, { color: colors.foreground }]}>{selectedTrip.name}</Text>
              {selectedTrip.destination && (
                <Text style={[styles.detailSubtitle, { color: colors.mutedForeground }]}>
                  📍 {selectedTrip.destination}
                </Text>
              )}
              <Text style={[styles.detailDates, { color: colors.mutedForeground }]}>
                📅 {formatDate(selectedTrip.start_date)} — {formatDate(selectedTrip.end_date)} • {diffDays(selectedTrip.start_date, selectedTrip.end_date)} days
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedTrip(null)}>
              <Text style={[styles.backLink, { color: colors.primary }]}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Outfits */}
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📅 Daily Outfits</Text>
          {days.map((day, index) => {
            const to = tripOutfits.find(t => t.planned_date === day);
            const outfit = to ? outfits.find(o => o.id === to.outfit_id) : null;

            return (
              <View key={day} style={[styles.dayRow, { backgroundColor: colors.secondary + '30', borderRadius: BorderRadius.lg }]}>
                <View style={styles.dayHeaderRow}>
                  <View>
                    <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>Day {index + 1}</Text>
                    <Text style={[styles.dayDate, { color: colors.foreground }]}>{formatDateLong(day)}</Text>
                  </View>
                  {!to && (
                    <TouchableOpacity
                      style={[styles.addOutfitBtn, { borderColor: colors.border }]}
                      onPress={() => { setSelectedDay(day); setShowOutfitPicker(true); }}
                    >
                      <Text style={[styles.addOutfitText, { color: colors.primary }]}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {outfit && to && (
                  <View style={styles.outfitAssignment}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {outfit.item_ids.slice(0, 3).map(itemId => {
                        const item = clothingItems.find(i => i.id === itemId);
                        if (!item) return null;
                        return (
                          <Image key={itemId} source={{ uri: item.image_url }} style={styles.outfitThumb} />
                        );
                      })}
                      {outfit.item_ids.length > 3 && (
                        <View style={[styles.moreThumb, { backgroundColor: colors.muted }]}>
                          <Text style={[{ color: colors.mutedForeground, fontSize: 11 }]}>+{outfit.item_ids.length - 3}</Text>
                        </View>
                      )}
                    </ScrollView>
                    <View style={styles.outfitNameRow}>
                      <Text style={[styles.outfitName, { color: colors.foreground }]} numberOfLines={1}>
                        {outfit.name}
                      </Text>
                      <TouchableOpacity onPress={() => removeTripOutfit(to.id)}>
                        <Text style={[{ color: colors.destructive, fontSize: 14 }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {!outfit && !to && (
                  <Text style={[styles.noOutfit, { color: colors.mutedForeground }]}>No outfit planned</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Packing List */}
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
          <View style={styles.packingHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🧳 Packing List</Text>
            <Text style={[styles.packingCount, { color: colors.mutedForeground }]}>
              ({packingList.length} items)
            </Text>
          </View>

          {packingList.length === 0 ? (
            <Text style={[styles.emptyPacking, { color: colors.mutedForeground }]}>
              Add outfits to generate your packing list
            </Text>
          ) : (
            Object.entries(packingByCategory).map(([category, cItems]) => (
              <View key={category} style={styles.packingCategory}>
                <Text style={[styles.packingCatLabel, { color: colors.mutedForeground }]}>
                  {CATEGORY_LABELS[category as ClothingCategory] || category}
                </Text>
                <View style={styles.packingItems}>
                  {cItems.map(item => (
                    <View key={item.id} style={[styles.packingItem, { backgroundColor: colors.secondary + '50' }]}>
                      <Image source={{ uri: item.image_url }} style={styles.packingItemImage} />
                      <Text style={[styles.packingItemName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Delete Trip */}
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.destructive + '10' }]}
          onPress={() => deleteTrip(selectedTrip.id)}
        >
          <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>🗑️ Delete Trip</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />

        {/* Outfit Picker Modal */}
        <Modal visible={showOutfitPicker} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Select Outfit for {selectedDay && formatDateLong(selectedDay)}
              </Text>
              <TouchableOpacity onPress={() => { setShowOutfitPicker(false); setSelectedDay(null); }}>
                <Text style={[styles.closeBtn, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {outfits.length === 0 ? (
                <View style={styles.emptyOutfits}>
                  <Text style={{ fontSize: 40, marginBottom: Spacing.base }}>👗</Text>
                  <Text style={[{ color: colors.mutedForeground, textAlign: 'center' }]}>
                    No saved outfits yet.{'\n'}Create outfits in the Create tab first!
                  </Text>
                </View>
              ) : (
                outfits.map(outfit => (
                  <TouchableOpacity
                    key={outfit.id}
                    style={[styles.outfitOption, { backgroundColor: colors.secondary + '30' }]}
                    onPress={() => addOutfitToDay(outfit.id)}
                  >
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {outfit.item_ids.slice(0, 3).map(itemId => {
                        const item = clothingItems.find(i => i.id === itemId);
                        if (!item) return null;
                        return <Image key={itemId} source={{ uri: item.image_url }} style={styles.optionThumb} />;
                      })}
                    </ScrollView>
                    <Text style={[styles.optionName, { color: colors.foreground }]}>{outfit.name}</Text>
                    {outfit.occasion && (
                      <Text style={[styles.optionOccasion, { color: colors.mutedForeground }]}>{outfit.occasion}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  // Trip list view
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Create Trip Button */}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
          ✈️  Plan a Trip
        </Text>
      </TouchableOpacity>

      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Upcoming Trips</Text>
          {upcomingTrips.map(trip => (
            <TouchableOpacity
              key={trip.id}
              style={[styles.tripCard, { backgroundColor: colors.card }, Shadows.elegant]}
              onPress={() => setSelectedTrip(trip)}
              onLongPress={() => deleteTrip(trip.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.tripIcon, { backgroundColor: colors.primary + '15' }]}>
                <Text style={{ fontSize: 24 }}>✈️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tripName, { color: colors.foreground }]}>{trip.name}</Text>
                <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>
                  {trip.destination ? `📍 ${trip.destination} • ` : ''}
                  {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                </Text>
              </View>
              <Text style={[{ color: colors.mutedForeground, fontSize: 18 }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Past Trips */}
      {pastTrips.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Past Trips</Text>
          {pastTrips.map(trip => (
            <TouchableOpacity
              key={trip.id}
              style={[styles.tripCard, { backgroundColor: colors.card, opacity: 0.7 }, Shadows.sm]}
              onPress={() => setSelectedTrip(trip)}
              onLongPress={() => deleteTrip(trip.id)}
            >
              <View style={[styles.tripIconSmall, { backgroundColor: colors.muted }]}>
                <Text style={{ fontSize: 18 }}>✈️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tripNameSmall, { color: colors.foreground }]}>{trip.name}</Text>
                <Text style={[styles.tripMetaSmall, { color: colors.mutedForeground }]}>
                  {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                </Text>
              </View>
              <Text style={[{ color: colors.mutedForeground, fontSize: 16 }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty state */}
      {trips.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card }, Shadows.elegant]}>
          <Text style={{ fontSize: 56, marginBottom: Spacing.base }}>✈️</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No trips planned yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
            Create a trip to start planning your outfits and packing list
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Create Trip Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Plan a Trip</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={[styles.closeBtn, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Trip Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g., Weekend in Paris"
              placeholderTextColor={colors.mutedForeground}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Destination (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g., Paris, France"
              placeholderTextColor={colors.mutedForeground}
              value={newDest}
              onChangeText={setNewDest}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Start Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              value={newStart}
              onChangeText={setNewStart}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>End Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              value={newEnd}
              onChangeText={setNewEnd}
              keyboardType="numbers-and-punctuation"
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={createTrip}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Create Trip</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
    createBtn: {
      height: 52,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: Spacing.base,
      marginTop: Spacing.base,
    },
    createBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    section: { marginTop: Spacing.lg, paddingHorizontal: Spacing.base },
    sectionLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, marginBottom: Spacing.sm, paddingLeft: 2 },
    tripCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BorderRadius.xl,
      padding: Spacing.base,
      marginBottom: Spacing.md,
      gap: Spacing.md,
    },
    tripIcon: { width: 48, height: 48, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
    tripIconSmall: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    tripName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
    tripNameSmall: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    tripMeta: { fontSize: Typography.fontSize.sm, marginTop: 2 },
    tripMetaSmall: { fontSize: Typography.fontSize.xs, marginTop: 2 },
    emptyCard: {
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.base,
      marginTop: Spacing['2xl'],
      padding: Spacing['2xl'],
      alignItems: 'center',
    },
    emptyTitle: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.medium, textAlign: 'center' },
    emptySubtext: { fontSize: Typography.fontSize.sm, textAlign: 'center', marginTop: Spacing.xs },
    // Detail view
    card: {
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.base,
      marginTop: Spacing.base,
      padding: Spacing.lg,
    },
    detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    detailTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.semibold, letterSpacing: Typography.letterSpacing.tight },
    detailSubtitle: { fontSize: Typography.fontSize.sm, marginTop: 4 },
    detailDates: { fontSize: Typography.fontSize.sm, marginTop: 2 },
    backLink: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    sectionTitle: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.md },
    dayRow: { padding: Spacing.base, marginBottom: Spacing.sm },
    dayHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    dayLabel: { fontSize: Typography.fontSize.xs, textTransform: 'uppercase' },
    dayDate: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    addOutfitBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1 },
    addOutfitText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    outfitAssignment: { gap: Spacing.sm },
    outfitThumb: { width: 40, height: 40, borderRadius: BorderRadius.md, marginRight: -4, borderWidth: 2, borderColor: colors.background },
    moreThumb: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
    outfitNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    outfitName: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, flex: 1 },
    noOutfit: { fontSize: Typography.fontSize.sm },
    packingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    packingCount: { fontSize: Typography.fontSize.sm },
    emptyPacking: { fontSize: Typography.fontSize.sm, textAlign: 'center', paddingVertical: Spacing.xl },
    packingCategory: { marginBottom: Spacing.base },
    packingCatLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium, textTransform: 'uppercase', marginBottom: Spacing.sm },
    packingItems: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    packingItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg },
    packingItemImage: { width: 32, height: 32, borderRadius: BorderRadius.sm },
    packingItemName: { fontSize: Typography.fontSize.sm },
    deleteBtn: { borderRadius: BorderRadius.xl, marginHorizontal: Spacing.base, marginTop: Spacing.lg, padding: Spacing.base, alignItems: 'center' },
    deleteBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    // Modal
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1 },
    modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold },
    closeBtn: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium },
    modalBody: { padding: Spacing.lg, gap: Spacing.md },
    inputLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    input: { height: 48, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.base, fontSize: Typography.fontSize.base, borderWidth: 1 },
    submitBtn: { height: 48, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.base },
    submitBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    emptyOutfits: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
    outfitOption: { borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
    optionThumb: { width: 32, height: 32, borderRadius: BorderRadius.sm, marginRight: 2, borderWidth: 1, borderColor: colors.background },
    optionName: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, marginTop: Spacing.sm },
    optionOccasion: { fontSize: Typography.fontSize.xs, marginTop: 2 },
  });
