import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useClothingItems } from '@/hooks/useClothingItems';
import { supabase } from '@/integrations/supabase/client';
import { ClothingItem, CATEGORY_LABELS } from '@/types/wardrobe';
import { Plus, X, Shirt } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface Outfit {
  id: string;
  name: string;
  item_ids: string[];
  occasion: string | null;
  worn_at: string | null;
  created_at: string;
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

  // Get outfits for a specific date
  const getOutfitsForDate = (date: Date) => {
    return outfits.filter(outfit => 
      outfit.worn_at && isSameDay(new Date(outfit.worn_at), date)
    );
  };

  // Get dates that have outfits
  const datesWithOutfits = outfits
    .filter(o => o.worn_at)
    .map(o => new Date(o.worn_at!));

  const outfitsForSelectedDate = selectedDate ? getOutfitsForDate(selectedDate) : [];

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const saveOutfit = async () => {
    if (!user || selectedItems.length === 0 || !selectedDate) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: outfitName || `Outfit for ${format(selectedDate, 'MMM d')}`,
          item_ids: selectedItems,
          occasion: occasion || null,
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
      toast({ title: 'Outfit logged!' });
    } catch (error) {
      console.error('Error saving outfit:', error);
      toast({ title: 'Failed to save outfit', variant: 'destructive' });
    } finally {
      setSaving(false);
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
    <AppLayout title="Outfit History" subtitle="Track what you wore">
      <div className="space-y-6 pb-24">
        {/* Calendar Card */}
        <div className="bg-card rounded-2xl shadow-elegant p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Calendar</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              hasOutfit: datesWithOutfits,
            }}
            modifiersStyles={{
              hasOutfit: {
                backgroundColor: 'hsl(var(--primary) / 0.15)',
                borderRadius: '12px',
              },
            }}
          />
        </div>

        {/* Selected Date Outfits Card */}
        <div className="bg-card rounded-2xl shadow-elegant p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </h3>
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Log Outfit
            </Button>
          </div>

          {outfitsForSelectedDate.length === 0 ? (
            <div className="bg-muted/30 rounded-xl border border-dashed p-8 text-center">
              <Shirt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No outfits logged for this day</p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setShowAddDialog(true)}
              >
                Log what you wore
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {outfitsForSelectedDate.map(outfit => (
                <div key={outfit.id} className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{outfit.name}</h4>
                      {outfit.occasion && (
                        <p className="text-sm text-muted-foreground">{outfit.occasion}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
                      onClick={() => deleteOutfit(outfit.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
            <DialogTitle>Log Outfit for {selectedDate && format(selectedDate, 'MMM d')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Outfit Name (optional)</Label>
              <Input
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="e.g., Work meeting look"
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
              {saving ? 'Saving...' : 'Save Outfit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
