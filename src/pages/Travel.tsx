import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useClothingItems } from '@/hooks/useClothingItems';
import { supabase } from '@/integrations/supabase/client';
import { ClothingItem, CATEGORY_LABELS } from '@/types/wardrobe';
import { 
  Plus, Plane, MapPin, Calendar as CalendarIcon, 
  ChevronRight, Trash2, Package, Shirt, X 
} from 'lucide-react';
import { format, differenceInDays, addDays, isSameDay, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

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

export default function Travel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: clothingItems } = useClothingItems('all');
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripOutfits, setTripOutfits] = useState<TripOutfit[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showAddOutfitDialog, setShowAddOutfitDialog] = useState(false);
  const [selectedDayForOutfit, setSelectedDayForOutfit] = useState<Date | null>(null);
  
  const [newTripName, setNewTripName] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [saving, setSaving] = useState(false);

  // Load trips
  useEffect(() => {
    if (!user) return;

    const loadTrips = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error loading trips:', error);
        return;
      }
      setTrips(data || []);
    };

    loadTrips();
  }, [user]);

  // Load outfits for outfit selection
  useEffect(() => {
    if (!user) return;

    const loadOutfits = async () => {
      const { data, error } = await supabase
        .from('outfits')
        .select('id, name, item_ids, occasion')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading outfits:', error);
        return;
      }
      setOutfits(data || []);
    };

    loadOutfits();
  }, [user]);

  // Load trip outfits when trip is selected
  useEffect(() => {
    if (!selectedTrip) {
      setTripOutfits([]);
      return;
    }

    const loadTripOutfits = async () => {
      const { data, error } = await supabase
        .from('trip_outfits')
        .select('*')
        .eq('trip_id', selectedTrip.id)
        .order('planned_date', { ascending: true });

      if (error) {
        console.error('Error loading trip outfits:', error);
        return;
      }
      setTripOutfits(data || []);
    };

    loadTripOutfits();
  }, [selectedTrip]);

  const createTrip = async () => {
    if (!user || !newTripName || !dateRange?.from || !dateRange?.to) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: newTripName,
          destination: newTripDestination || null,
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;

      setTrips(prev => [...prev, data].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ));
      setShowCreateDialog(false);
      setNewTripName('');
      setNewTripDestination('');
      setDateRange(undefined);
      toast({ title: 'Trip created!' });
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({ title: 'Failed to create trip', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      setTrips(prev => prev.filter(t => t.id !== tripId));
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
        setShowTripDetails(false);
      }
      toast({ title: 'Trip deleted' });
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({ title: 'Failed to delete trip', variant: 'destructive' });
    }
  };

  const addOutfitToDay = async (outfitId: string) => {
    if (!selectedTrip || !selectedDayForOutfit) return;

    try {
      const { data, error } = await supabase
        .from('trip_outfits')
        .insert({
          trip_id: selectedTrip.id,
          outfit_id: outfitId,
          planned_date: format(selectedDayForOutfit, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;

      setTripOutfits(prev => [...prev, data].sort((a, b) => 
        new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime()
      ));
      setShowAddOutfitDialog(false);
      setSelectedDayForOutfit(null);
      toast({ title: 'Outfit added to trip!' });
    } catch (error) {
      console.error('Error adding outfit to trip:', error);
      toast({ title: 'Failed to add outfit', variant: 'destructive' });
    }
  };

  const removeTripOutfit = async (tripOutfitId: string) => {
    try {
      const { error } = await supabase
        .from('trip_outfits')
        .delete()
        .eq('id', tripOutfitId);

      if (error) throw error;

      setTripOutfits(prev => prev.filter(to => to.id !== tripOutfitId));
      toast({ title: 'Outfit removed' });
    } catch (error) {
      console.error('Error removing outfit:', error);
      toast({ title: 'Failed to remove outfit', variant: 'destructive' });
    }
  };

  // Generate packing list from trip outfits
  const packingList = useMemo(() => {
    const itemSet = new Set<string>();
    tripOutfits.forEach(to => {
      const outfit = outfits.find(o => o.id === to.outfit_id);
      if (outfit) {
        outfit.item_ids.forEach(id => itemSet.add(id));
      }
    });
    return Array.from(itemSet)
      .map(id => clothingItems.find(item => item.id === id))
      .filter(Boolean) as ClothingItem[];
  }, [tripOutfits, outfits, clothingItems]);

  // Group packing list by category
  const packingListByCategory = useMemo(() => {
    const grouped: Record<string, ClothingItem[]> = {};
    packingList.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [packingList]);

  const getOutfitById = (outfitId: string | null) => 
    outfits.find(o => o.id === outfitId);

  const getClothingItem = (itemId: string) => 
    clothingItems.find(item => item.id === itemId);

  const getTripDays = (trip: Trip) => {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    return eachDayOfInterval({ start, end });
  };

  const getOutfitForDay = (date: Date) => {
    return tripOutfits.find(to => 
      isSameDay(new Date(to.planned_date), date)
    );
  };

  const upcomingTrips = trips.filter(t => new Date(t.end_date) >= new Date());
  const pastTrips = trips.filter(t => new Date(t.end_date) < new Date());

  return (
    <AppLayout title="Travel & Planning" subtitle="Pack smart for your trips">
      <div className="space-y-6 pb-24">
        {/* Create Trip Button */}
        <Button 
          onClick={() => setShowCreateDialog(true)} 
          className="w-full gap-2 h-12 rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Plan a Trip
        </Button>

        {/* Upcoming Trips */}
        {upcomingTrips.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display text-sm font-medium text-muted-foreground px-1">
              Upcoming Trips
            </h3>
            {upcomingTrips.map(trip => (
              <Card 
                key={trip.id} 
                className="border-0 shadow-elegant cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setSelectedTrip(trip);
                  setShowTripDetails(true);
                }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Plane className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{trip.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {trip.destination && (
                        <>
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{trip.destination}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>
                        {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Past Trips */}
        {pastTrips.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display text-sm font-medium text-muted-foreground px-1">
              Past Trips
            </h3>
            {pastTrips.map(trip => (
              <Card 
                key={trip.id} 
                className="border-0 shadow-sm opacity-75 cursor-pointer hover:opacity-100 transition-opacity"
                onClick={() => {
                  setSelectedTrip(trip);
                  setShowTripDetails(true);
                }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Plane className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate text-sm">{trip.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {trips.length === 0 && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plane className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display font-medium mb-2">No trips planned yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a trip to start planning your outfits and packing list
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Plan Your First Trip
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Trip Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan a Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trip Name</Label>
              <Input
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="e.g., Weekend in Paris"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Destination (optional)</Label>
              <Input
                value={newTripDestination}
                onChange={(e) => setNewTripDestination(e.target.value)}
                placeholder="e.g., Paris, France"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Travel Dates</Label>
              <div className="mt-1.5">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </div>
            </div>
            <Button
              onClick={createTrip}
              disabled={!newTripName || !dateRange?.from || !dateRange?.to || saving}
              className="w-full rounded-xl"
            >
              {saving ? 'Creating...' : 'Create Trip'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trip Details Dialog */}
      <Dialog open={showTripDetails} onOpenChange={setShowTripDetails}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedTrip && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedTrip.name}</DialogTitle>
                    {selectedTrip.destination && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedTrip.destination}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteTrip(selectedTrip.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Trip Days with Outfits */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Daily Outfits</h4>
                  {getTripDays(selectedTrip).map((day, index) => {
                    const tripOutfit = getOutfitForDay(day);
                    const outfit = tripOutfit ? getOutfitById(tripOutfit.outfit_id) : null;

                    return (
                      <div key={day.toISOString()} className="bg-secondary/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase">
                              Day {index + 1}
                            </span>
                            <p className="font-medium text-sm">
                              {format(day, 'EEEE, MMM d')}
                            </p>
                          </div>
                          {!tripOutfit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 rounded-lg"
                              onClick={() => {
                                setSelectedDayForOutfit(day);
                                setShowAddOutfitDialog(true);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              Add Outfit
                            </Button>
                          )}
                        </div>

                        {outfit && tripOutfit && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {outfit.item_ids.slice(0, 3).map(itemId => {
                                  const item = getClothingItem(itemId);
                                  if (!item) return null;
                                  return (
                                    <div 
                                      key={itemId} 
                                      className="w-10 h-10 rounded-lg overflow-hidden border-2 border-background"
                                    >
                                      <img 
                                        src={item.image_url} 
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  );
                                })}
                                {outfit.item_ids.length > 3 && (
                                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border-2 border-background text-xs font-medium">
                                    +{outfit.item_ids.length - 3}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-medium">{outfit.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeTripOutfit(tripOutfit.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {!outfit && !tripOutfit && (
                          <p className="text-sm text-muted-foreground">No outfit planned</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Packing List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h4 className="font-medium text-sm">Packing List</h4>
                    <span className="text-xs text-muted-foreground">
                      ({packingList.length} items)
                    </span>
                  </div>

                  {packingList.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Add outfits to generate your packing list
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(packingListByCategory).map(([category, items]) => (
                        <div key={category}>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {items.map(item => (
                              <div 
                                key={item.id}
                                className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2"
                              >
                                <div className="w-8 h-8 rounded-md overflow-hidden">
                                  <img 
                                    src={item.image_url} 
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-sm">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Outfit to Day Dialog */}
      <Dialog open={showAddOutfitDialog} onOpenChange={setShowAddOutfitDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Select Outfit for {selectedDayForOutfit && format(selectedDayForOutfit, 'MMM d')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {outfits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Create outfits in the Create page first
              </p>
            ) : (
              outfits.map(outfit => (
                <button
                  key={outfit.id}
                  onClick={() => addOutfitToDay(outfit.id)}
                  className="w-full p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      {outfit.item_ids.slice(0, 2).map(itemId => {
                        const item = getClothingItem(itemId);
                        if (!item) return null;
                        return (
                          <div 
                            key={itemId} 
                            className="w-8 h-8 rounded-md overflow-hidden border border-background"
                          >
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{outfit.name}</p>
                      {outfit.occasion && (
                        <p className="text-xs text-muted-foreground">{outfit.occasion}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
