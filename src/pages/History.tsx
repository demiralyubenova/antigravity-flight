import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useClothingItems } from '@/hooks/useClothingItems';
import { supabase } from '@/integrations/supabase/client';
import { ClothingItem, CATEGORY_LABELS } from '@/types/wardrobe';
import { Plus, X, Shirt, CalendarDays, Plane, BarChart3 } from 'lucide-react';
import { format, isSameDay, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface Outfit {
  id: string;
  name: string;
  item_ids: string[];
  occasion: string | null;
  event_name: string | null;
  is_planned: boolean;
  worn_at: string | null;
  created_at: string;
}

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string;
  end_date: string;
}

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: clothingItems } = useClothingItems('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [saving, setSaving] = useState(false);
  const [eventName, setEventName] = useState('');
  const [isPlanned, setIsPlanned] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);

  // Load outfits
  useEffect(() => {
    if (!user) return;

    const loadOutfits = async () => {
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user.id)
        .order('worn_at', { ascending: false });

      if (error) {
        console.error('Error loading outfits:', error);
        return;
      }

      setOutfits(data || []);
    };

    loadOutfits();
  }, [user]);

  // Load trips for calendar indicators
  useEffect(() => {
    if (!user) return;

    const loadTrips = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, name, destination, start_date, end_date')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading trips:', error);
        return;
      }

      setTrips(data || []);
    };

    loadTrips();
  }, [user]);

  // Get outfits for a specific date (both worn and planned)
  const getOutfitsForDate = (date: Date) => {
    return outfits.filter(outfit => 
      outfit.worn_at && isSameDay(new Date(outfit.worn_at), date)
    );
  };

  // Separate worn and planned outfits
  const wornOutfits = useMemo(() => 
    outfits.filter(o => o.worn_at && !o.is_planned), [outfits]
  );
  
  const plannedOutfits = useMemo(() => 
    outfits.filter(o => o.worn_at && o.is_planned), [outfits]
  );

  // Get dates that have worn outfits
  const datesWithWornOutfits = wornOutfits.map(o => new Date(o.worn_at!));
  
  // Get dates that have planned outfits
  const datesWithPlannedOutfits = plannedOutfits.map(o => new Date(o.worn_at!));

  // Get trip for a specific date
  const getTripForDate = (date: Date) => {
    return trips.find(trip => {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  // Get dates that are part of trips
  const datesInTrips = useMemo(() => {
    const dates: Date[] = [];
    trips.forEach(trip => {
      let current = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }, [trips]);

  const outfitsForSelectedDate = selectedDate ? getOutfitsForDate(selectedDate) : [];
  const tripForSelectedDate = selectedDate ? getTripForDate(selectedDate) : null;

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const saveOutfit = async () => {
    if (!user || selectedItems.length === 0 || !selectedDate) return;

    const isFutureDate = selectedDate > new Date();

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: outfitName || `Outfit for ${format(selectedDate, 'MMM d')}`,
          item_ids: selectedItems,
          occasion: occasion || null,
          event_name: eventName || null,
          is_planned: isFutureDate || isPlanned,
          worn_at: selectedDate.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setOutfits(prev => [data, ...prev]);
      setShowAddDialog(false);
      setSelectedItems([]);
      setOutfitName('');
      setOccasion('');
      setEventName('');
      setIsPlanned(false);
      toast({ title: isFutureDate ? 'Outfit planned!' : 'Outfit logged!' });
    } catch (error) {
      console.error('Error saving outfit:', error);
      toast({ title: 'Failed to save outfit', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const markAsWorn = async (outfitId: string) => {
    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_planned: false })
        .eq('id', outfitId);

      if (error) throw error;

      setOutfits(prev => prev.map(o => 
        o.id === outfitId ? { ...o, is_planned: false } : o
      ));
      toast({ title: 'Marked as worn!' });
    } catch (error) {
      console.error('Error updating outfit:', error);
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const deleteOutfit = async (outfitId: string) => {
    try {
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfitId);

      if (error) throw error;

      setOutfits(prev => prev.filter(o => o.id !== outfitId));
      toast({ title: 'Outfit removed' });
    } catch (error) {
      console.error('Error deleting outfit:', error);
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const getClothingItem = (itemId: string) => 
    clothingItems.find(item => item.id === itemId);

  return (
    <AppLayout title="Outfit History" subtitle="Track what you wore & plan ahead">
      <div className="space-y-6 pb-24">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 gap-2 rounded-xl"
            onClick={() => window.location.href = '/travel'}
          >
            <Plane className="h-4 w-4" />
            Plan Trip
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 gap-2 rounded-xl"
            onClick={() => window.location.href = '/insights'}
          >
            <BarChart3 className="h-4 w-4" />
            View Insights
          </Button>
        </div>

        {/* Calendar Card */}
        <div className="bg-card rounded-2xl shadow-elegant p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Calendar</h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary/30" />
                <span className="text-muted-foreground">Worn</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-primary" />
                <span className="text-muted-foreground">Planned</span>
              </div>
              <div className="flex items-center gap-1">
                <Plane className="h-3 w-3 text-accent-foreground" />
                <span className="text-muted-foreground">Trip</span>
              </div>
            </div>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              hasWornOutfit: datesWithWornOutfits,
              hasPlannedOutfit: datesWithPlannedOutfits,
              inTrip: datesInTrips,
            }}
            modifiersStyles={{
              hasWornOutfit: {
                backgroundColor: 'hsl(var(--primary) / 0.2)',
                borderRadius: '12px',
              },
              hasPlannedOutfit: {
                border: '2px solid hsl(var(--primary))',
                borderRadius: '12px',
              },
              inTrip: {
                backgroundColor: 'hsl(var(--accent) / 0.3)',
                borderRadius: '12px',
              },
            }}
          />
        </div>

        {/* Trip Indicator for Selected Date */}
        {tripForSelectedDate && (
          <div className="bg-accent/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center">
              <Plane className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{tripForSelectedDate.name}</p>
              {tripForSelectedDate.destination && (
                <p className="text-xs text-muted-foreground">{tripForSelectedDate.destination}</p>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto rounded-lg"
              onClick={() => window.location.href = '/travel'}
            >
              View Trip
            </Button>
          </div>
        )}

        {/* Selected Date Outfits Card */}
        <div className="bg-card rounded-2xl shadow-elegant p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </h3>
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              {selectedDate && selectedDate > new Date() ? 'Plan Outfit' : 'Log Outfit'}
            </Button>
          </div>

          {outfitsForSelectedDate.length === 0 ? (
            <div className="bg-muted/30 rounded-xl border border-dashed p-8 text-center">
              <Shirt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                {selectedDate && selectedDate > new Date() 
                  ? 'No outfits planned for this day' 
                  : 'No outfits logged for this day'}
              </p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setShowAddDialog(true)}
              >
                {selectedDate && selectedDate > new Date() ? 'Plan an outfit' : 'Log what you wore'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {outfitsForSelectedDate.map(outfit => (
                <div key={outfit.id} className={cn(
                  "rounded-xl p-4",
                  outfit.is_planned ? "bg-primary/5 border border-primary/20" : "bg-secondary/30"
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{outfit.name}</h4>
                        {outfit.is_planned && (
                          <Badge variant="outline" className="text-xs">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            Planned
                          </Badge>
                        )}
                      </div>
                      {outfit.event_name && (
                        <p className="text-sm font-medium text-primary">{outfit.event_name}</p>
                      )}
                      {outfit.occasion && (
                        <p className="text-sm text-muted-foreground">{outfit.occasion}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {outfit.is_planned && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-primary hover:text-primary"
                          onClick={() => markAsWorn(outfit.id)}
                        >
                          Mark Worn
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
                        onClick={() => deleteOutfit(outfit.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {outfit.item_ids.map(itemId => {
                      const item = getClothingItem(itemId);
                      if (!item) return null;
                      return (
                        <div key={itemId} className="w-14 h-14 rounded-xl overflow-hidden bg-muted shadow-sm">
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Outfit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && selectedDate > new Date() 
                ? `Plan Outfit for ${format(selectedDate, 'MMM d')}`
                : `Log Outfit for ${selectedDate && format(selectedDate, 'MMM d')}`
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Event Name (optional)</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Friday dinner, Wedding, Conference"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Outfit Name (optional)</Label>
              <Input
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="e.g., Smart casual look"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Occasion (optional)</Label>
              <Input
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g., Office, Date night, Casual"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Select Items ({selectedItems.length} selected)</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {clothingItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      selectedItems.includes(item.id)
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-primary/30"
                    )}
                  >
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {clothingItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add items to your wardrobe first
                </p>
              )}
            </div>

            <Button 
              onClick={saveOutfit} 
              disabled={selectedItems.length === 0 || saving}
              className="w-full"
            >
              {saving ? 'Saving...' : (selectedDate && selectedDate > new Date() ? 'Plan Outfit' : 'Save Outfit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
