import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Palette, Loader2, Sparkles, X, Plus, Eye } from 'lucide-react';
import { useClothingItems } from '@/hooks/useClothingItems';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClothingItem, CATEGORY_LABELS, ClothingCategory } from '@/types/wardrobe';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Create() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: wardrobeItems } = useClothingItems('all');
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all');

  // Load user's avatar for try-on
  useEffect(() => {
    if (!user) return;
    
    const loadAvatar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.avatar_url) {
        setPersonImage(data.avatar_url);
      }
    };
    
    loadAvatar();
  }, [user]);

  const occasionSuggestions = [
    'Business Meeting',
    'Date Night',
    'Casual Weekend',
    'Wedding Guest',
    'Job Interview',
    'Beach Day',
  ];

  const categories: (ClothingCategory | 'all')[] = ['all', 'tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'];

  const filteredItems = activeCategory === 'all' 
    ? wardrobeItems 
    : wardrobeItems.filter(item => item.category === activeCategory);

  const toggleItem = (item: ClothingItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      }
      return [...prev, item];
    });
    setTryOnResult(null);
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== itemId));
    setTryOnResult(null);
  };

  const handleAISuggest = async () => {
    if (!occasion) {
      toast({ title: 'Enter an occasion first', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stylist-chat', {
        body: {
          message: `Create a complete outfit for: ${occasion}. Select specific items from my wardrobe that work well together. List the exact item names I should use.`,
          wardrobeItems: wardrobeItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            color: item.color,
            brand: item.brand,
          })),
          recentOutfits: [],
        },
      });

      if (error) throw error;

      toast({ 
        title: 'AI Suggestion Ready', 
        description: 'Check the stylist chat for outfit recommendations!',
      });
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast({ title: 'Failed to get suggestion', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleTryOn = async () => {
    if (!personImage) {
      toast({ 
        title: 'No photo found', 
        description: 'Please upload your photo in the Try On page first',
        variant: 'destructive' 
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({ title: 'Select at least one item', variant: 'destructive' });
      return;
    }

    setTryOnLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('outfit-tryon', {
        body: {
          personImageUrl: personImage,
          clothingItems: selectedItems.map(item => ({
            name: item.name,
            category: item.category,
            image_url: item.image_url,
          })),
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.tryOnImageUrl) {
        setTryOnResult(data.tryOnImageUrl);
        toast({ title: 'Outfit try-on complete!' });
      }
    } catch (error: any) {
      console.error('Error in outfit try-on:', error);
      toast({ 
        title: 'Try-on failed', 
        description: error.message || 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setTryOnLoading(false);
    }
  };

  return (
    <AppLayout title="Outfit Creator" subtitle="Build and try on complete outfits">
      <div className="pb-24 space-y-6">
        {/* Selected Items Preview */}
        <div className="px-4">
          <h3 className="font-display text-sm font-medium text-muted-foreground mb-3">
            Your Outfit ({selectedItems.length} items)
          </h3>
          
          {selectedItems.length === 0 ? (
            <div className="h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select items below to build your outfit</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {selectedItems.map(item => (
                <div key={item.id} className="relative flex-shrink-0">
                  <div className="w-20 h-24 rounded-lg overflow-hidden bg-muted border-2 border-primary">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <p className="text-xs text-center mt-1 truncate w-20">{item.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Try On Result */}
        {tryOnResult && (
          <div className="px-4">
            <h3 className="font-display text-sm font-medium text-muted-foreground mb-3">Try-On Result</h3>
            <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted">
              <img src={tryOnResult} alt="Outfit try-on" className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                  <span className="text-sm font-medium text-primary">✨ Your Complete Look</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Suggestion */}
        <div className="px-4 space-y-3">
          <label className="text-sm font-medium text-foreground block">
            Get AI outfit suggestions
          </label>
          <div className="flex gap-2">
            <Input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="What's the occasion?"
              className="flex-1"
            />
            <Button onClick={handleAISuggest} disabled={!occasion || loading} variant="secondary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {occasionSuggestions.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setOccasion(suggestion)}
                className="px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Wardrobe Items */}
        <div className="space-y-3">
          <div className="px-4">
            <h3 className="font-display text-sm font-medium text-muted-foreground">Select Items</h3>
          </div>
          
          <ScrollArea className="w-full">
            <div className="flex gap-2 px-4 pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 px-4">
            {filteredItems.map(item => {
              const isSelected = selectedItems.some(i => i.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item)}
                  className={cn(
                    "aspect-square rounded-lg overflow-hidden border-2 transition-all relative",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-primary/30"
                  )}
                >
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Plus className="h-4 w-4 rotate-45" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-muted-foreground text-sm">No items in this category</p>
            </div>
          )}
        </div>

        {/* Try On Button */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <Button
              onClick={handleTryOn}
              disabled={tryOnLoading || !personImage}
              className="w-full max-w-md mx-auto h-14 text-lg gap-3"
              size="lg"
            >
              {tryOnLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating your look...
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5" />
                  Try On Outfit ({selectedItems.length} items)
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
