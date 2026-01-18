import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Eye, RefreshCw, AlertTriangle, ShoppingBag, Check, CalendarDays, CloudSun, Save, Plane } from 'lucide-react';
import { useClothingItems } from '@/hooks/useClothingItems';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClothingItem } from '@/types/wardrobe';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { WeatherOutfits } from '@/components/weather/WeatherOutfits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OutfitFeedback } from '@/components/outfit/OutfitFeedback';
import { useOutfitFeedback } from '@/hooks/useOutfitFeedback';
import { TextShimmer } from '@/components/ui/text-shimmer';
interface OutfitSuggestion {
  name: string;
  description: string;
  itemIds: string[];
  items?: ClothingItem[];
  tryOnImageUrl?: string;
}

export default function Create() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: wardrobeItems } = useClothingItems('all');
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [tryOnLoading, setTryOnLoading] = useState<Set<number>>(new Set());
  const [outfitSuggestions, setOutfitSuggestions] = useState<OutfitSuggestion[]>([]);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [recentOutfits, setRecentOutfits] = useState<any[]>([]);
  const [insufficientWardrobe, setInsufficientWardrobe] = useState<{ insufficient: boolean; missingItems: string[] } | null>(null);
  const [wornOutfits, setWornOutfits] = useState<Set<number>>(new Set());
  const [savedOutfits, setSavedOutfits] = useState<Set<number>>(new Set());
  const [savingOutfit, setSavingOutfit] = useState<number | null>(null);

  const getCreateStateKey = (userId: string) => `create_occasion_state_${userId}`;

  // Persist occasion outfits so they don't disappear when leaving the page
  useEffect(() => {
    if (!user) return;

    const raw = localStorage.getItem(getCreateStateKey(user.id));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        occasion?: string;
        outfitSuggestions?: Array<{
          name: string;
          description: string;
          itemIds: string[];
          tryOnImageUrl?: string;
        }>;
        insufficientWardrobe?: { insufficient: boolean; missingItems: string[] } | null;
      };

      if (typeof parsed.occasion === 'string') setOccasion(parsed.occasion);
      if (parsed.insufficientWardrobe !== undefined) setInsufficientWardrobe(parsed.insufficientWardrobe);
      if (Array.isArray(parsed.outfitSuggestions)) setOutfitSuggestions(parsed.outfitSuggestions);
    } catch {
      // ignore invalid JSON
    }
  }, [user]);

  // Re-hydrate item objects once wardrobe loads
  useEffect(() => {
    if (wardrobeItems.length === 0) return;
    setOutfitSuggestions(prev =>
      prev.map(o => ({
        ...o,
        items: o.itemIds
          .map(id => wardrobeItems.find(item => item.id === id))
          .filter(Boolean) as ClothingItem[],
      }))
    );
  }, [wardrobeItems]);

  // Save state on every change (store only serializable fields)
  useEffect(() => {
    if (!user) return;

    localStorage.setItem(
      getCreateStateKey(user.id),
      JSON.stringify({
        occasion,
        insufficientWardrobe,
        outfitSuggestions: outfitSuggestions.map(({ name, description, itemIds, tryOnImageUrl }) => ({
          name,
          description,
          itemIds,
          tryOnImageUrl,
        })),
        updatedAt: Date.now(),
      })
    );
  }, [user, occasion, insufficientWardrobe, outfitSuggestions]);

  // Load user's avatar for try-on (check localStorage first for persisted photo)
  useEffect(() => {
    if (!user) return;
    
    const loadAvatar = async () => {
      // Check localStorage first (same key as Try On page)
      const persistedPhoto = localStorage.getItem(`tryon_photo_${user.id}`);
      if (persistedPhoto) {
        setPersonImage(persistedPhoto);
        return;
      }

      // Fall back to saved avatar from profile
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

  // Load recent outfits to avoid suggesting similar ones
  useEffect(() => {
    if (!user) return;

    const loadRecentOutfits = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('outfits')
        .select('*, item_ids')
        .eq('user_id', user.id)
        .gte('worn_at', thirtyDaysAgo.toISOString())
        .order('worn_at', { ascending: false })
        .limit(10);

      if (data) {
        // Map item_ids to actual items
        const outfitsWithItems = data.map(outfit => ({
          ...outfit,
          items: wardrobeItems.filter(item => outfit.item_ids.includes(item.id))
        }));
        setRecentOutfits(outfitsWithItems);
      }
    };

    if (wardrobeItems.length > 0) {
      loadRecentOutfits();
    }
  }, [user, wardrobeItems]);

  const occasionSuggestions = [
    'Business Meeting',
    'Date Night',
    'Casual Weekend',
    'Wedding Guest',
    'Job Interview',
    'Beach Day',
    'Gym Session',
    'Night Out',
  ];

  const { getFeedbackSummary } = useOutfitFeedback();

  const handleGenerateOutfits = async () => {
    if (!occasion) {
      toast({ title: 'Enter an occasion first', variant: 'destructive' });
      return;
    }

    if (wardrobeItems.length === 0) {
      toast({ title: 'Add some items to your wardrobe first', variant: 'destructive' });
      return;
    }

    setLoading(true);
    // Don't clear suggestions - keep them visible while loading new ones
    setTryOnLoading(new Set());
    setInsufficientWardrobe(null);

    // Get feedback summary for AI context
    const feedbackSummary = getFeedbackSummary();

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
          recentOutfits: recentOutfits.map(outfit => ({
            worn_at: outfit.worn_at,
            items: outfit.items?.map((i: ClothingItem) => ({ name: i.name })),
          })),
          userFeedback: feedbackSummary,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Check if wardrobe is insufficient for the occasion
      if (data.insufficient) {
        setInsufficientWardrobe({
          insufficient: true,
          missingItems: data.missingItems || [],
        });
        toast({ 
          title: 'Wardrobe gaps detected', 
          description: 'You might need some items for this occasion',
          variant: 'destructive'
        });
        return;
      }

      if (data.outfits && Array.isArray(data.outfits)) {
        // Map item IDs to actual items
        const suggestionsWithItems = data.outfits.map((outfit: OutfitSuggestion) => ({
          ...outfit,
          items: outfit.itemIds
            .map(id => wardrobeItems.find(item => item.id === id))
            .filter(Boolean) as ClothingItem[],
        }));

        setOutfitSuggestions(suggestionsWithItems);
        toast({ title: '✨ Creating try-on previews...' });

        // Automatically generate try-on for all outfits if person image available
        if (personImage) {
          suggestionsWithItems.forEach((_: OutfitSuggestion, index: number) => {
            generateTryOn(index, suggestionsWithItems);
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating outfits:', error);
      toast({ 
        title: 'Failed to generate outfits', 
        description: error.message || 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTryOn = async (index: number, outfits: OutfitSuggestion[]) => {
    const outfit = outfits[index];
    
    if (!personImage || !outfit.items || outfit.items.length === 0) return;

    setTryOnLoading(prev => new Set([...prev, index]));
    try {
      const { data, error } = await supabase.functions.invoke('outfit-tryon', {
        body: {
          personImageUrl: personImage,
          clothingItems: outfit.items.map(item => ({
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
        setOutfitSuggestions(prev => prev.map((o, i) => 
          i === index ? { ...o, tryOnImageUrl: data.tryOnImageUrl } : o
        ));
      }
    } catch (error: any) {
      console.error('Error in outfit try-on:', error);
    } finally {
      setTryOnLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const handleRetryTryOn = async (index: number) => {
    if (!personImage) {
      toast({ 
        title: 'No photo found', 
        description: 'Please upload your photo in the Try On page first',
        variant: 'destructive' 
      });
      return;
    }
    generateTryOn(index, outfitSuggestions);
  };

  const handleWearToday = async (index: number) => {
    const outfit = outfitSuggestions[index];
    
    if (!user || !outfit.items || outfit.items.length === 0) return;

    setSavingOutfit(index);
    try {
      const today = new Date();
      const { error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: outfit.name,
          item_ids: outfit.itemIds,
          occasion: occasion || null,
          worn_at: today.toISOString(),
        });

      if (error) throw error;

      setWornOutfits(prev => new Set([...prev, index]));
      setSavedOutfits(prev => new Set([...prev, index]));
      toast({ 
        title: 'Outfit logged!', 
        description: `Added to your history for ${format(today, 'MMM d, yyyy')}` 
      });
    } catch (error: any) {
      console.error('Error saving outfit:', error);
      toast({ 
        title: 'Failed to save outfit', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSavingOutfit(null);
    }
  };

  const handleSaveOutfit = async (index: number) => {
    const outfit = outfitSuggestions[index];
    
    if (!user || !outfit.items || outfit.items.length === 0) return;

    setSavingOutfit(index);
    try {
      const { error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: outfit.name,
          item_ids: outfit.itemIds,
          occasion: occasion || null,
          is_planned: true,
        });

      if (error) throw error;

      setSavedOutfits(prev => new Set([...prev, index]));
      toast({ 
        title: 'Outfit saved!', 
        description: 'Available in Travel for trip planning' 
      });
    } catch (error: any) {
      console.error('Error saving outfit:', error);
      toast({ 
        title: 'Failed to save outfit', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSavingOutfit(null);
    }
  };

  return (
    <AppLayout title="Outfit Creator" subtitle="AI-powered outfit suggestions">
      <div className="pb-24 px-4">
        <Tabs defaultValue="weather" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weather" className="gap-2">
              <CloudSun className="h-4 w-4" />
              Weather
            </TabsTrigger>
            <TabsTrigger value="occasion" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Occasion
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weather" className="space-y-4" forceMount>
            <WeatherOutfits />
          </TabsContent>

          <TabsContent value="occasion" className="space-y-6" forceMount>
        {/* Occasion Input Card */}
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-5 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="font-display text-lg font-medium tracking-tight">
                What's the occasion?
              </h2>
              <p className="text-sm text-muted-foreground">
                Tell me where you're going and I'll create 3 outfit options
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g., Business meeting, date night..."
                className="flex-1 h-12 rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateOutfits()}
              />
              <Button 
                onClick={handleGenerateOutfits} 
                disabled={!occasion || loading} 
                className="h-12 px-6 gap-2 rounded-xl"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>

            {/* Quick Occasion Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {occasionSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setOccasion(suggestion)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-all",
                    occasion === suggestion
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
                  <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                </div>
                <TextShimmer 
                  className="text-lg font-medium [--base-color:theme(colors.primary)] [--base-gradient-color:theme(colors.primary/0.3)]" 
                  duration={1.5}
                >
                  Creating your perfect outfits...
                </TextShimmer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insufficient Wardrobe Warning */}
        {insufficientWardrobe?.insufficient && (
          <Card className="border-0 shadow-elegant bg-destructive/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-medium">
                    Your wardrobe needs more items
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    You don't have enough suitable items for <span className="font-medium text-foreground">{occasion}</span>
                  </p>
                </div>
              </div>
              
              {insufficientWardrobe.missingItems.length > 0 && (
                <div className="space-y-2 pl-13">
                  <p className="text-sm font-medium">Suggested items to add:</p>
                  <ul className="space-y-1.5">
                    {insufficientWardrobe.missingItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                        <span className="capitalize">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/wardrobe'}
                  className="gap-2 rounded-xl"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Go to Wardrobe
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    setInsufficientWardrobe(null);
                    setOccasion('');
                  }}
                >
                  Try Different Occasion
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Outfit Suggestions */}
        {outfitSuggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-display text-sm font-medium text-muted-foreground">
                Your Outfit Options
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGenerateOutfits}
                disabled={loading}
                className="gap-1"
              >
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                Regenerate
              </Button>
            </div>

            <div className="space-y-6">
              {outfitSuggestions.map((outfit, index) => (
                <Card key={index} className="border-0 shadow-elegant overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    {/* Outfit Header */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          {index + 1}
                        </span>
                        <h4 className="font-display font-medium tracking-tight">
                          {outfit.name}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground pl-8">
                        {outfit.description}
                      </p>
                    </div>

                    {/* Side-by-side: Try-on + Items */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Try On Result / Loading */}
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted border border-border">
                        {tryOnLoading.has(index) ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <TextShimmer 
                              className="text-sm font-medium" 
                              duration={1.2}
                            >
                              Generating your look...
                            </TextShimmer>
                          </div>
                        ) : outfit.tryOnImageUrl ? (
                          <>
                            <img 
                              src={outfit.tryOnImageUrl} 
                              alt={`${outfit.name} try-on`} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="bg-background/90 backdrop-blur-sm rounded-lg px-2 py-1.5 text-center">
                                <span className="text-xs font-medium text-primary">✨ Your Look</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                            <Eye className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-xs text-muted-foreground">
                              {personImage ? 'Try-on will appear here' : 'Upload photo in Try On page'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Outfit Items Grid */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Items</p>
                        <div className="grid grid-cols-2 gap-2">
                          {outfit.items?.map((item) => (
                            <div key={item.id} className="space-y-1">
                              <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                                <img 
                                  src={item.image_url} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <p className="text-[10px] text-center truncate text-muted-foreground">
                                {item.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleRetryTryOn(index)}
                        disabled={tryOnLoading.has(index) || !personImage}
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 rounded-xl"
                      >
                        {tryOnLoading.has(index) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Retry
                      </Button>
                      <Button
                        onClick={() => handleSaveOutfit(index)}
                        disabled={savingOutfit !== null || savedOutfits.has(index)}
                        variant={savedOutfits.has(index) ? "secondary" : "outline"}
                        size="sm"
                        className="gap-1.5 rounded-xl"
                      >
                        {savingOutfit === index && !wornOutfits.has(index) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : savedOutfits.has(index) ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        {savedOutfits.has(index) ? 'Saved' : 'Save'}
                      </Button>
                      <Button
                        onClick={() => handleWearToday(index)}
                        disabled={savingOutfit !== null || wornOutfits.has(index)}
                        variant={wornOutfits.has(index) ? "secondary" : "default"}
                        size="sm"
                        className="gap-1.5 rounded-xl"
                      >
                        {savingOutfit === index && !savedOutfits.has(index) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : wornOutfits.has(index) ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        {wornOutfits.has(index) ? 'Logged!' : 'Wear Today'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 rounded-xl"
                        onClick={() => window.location.href = '/travel'}
                      >
                        <Plane className="h-3.5 w-3.5" />
                        Travel
                      </Button>
                    </div>

                    {/* Feedback Section */}
                    <OutfitFeedback 
                      outfitItemIds={outfit.itemIds} 
                      occasion={occasion}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && outfitSuggestions.length === 0 && !insufficientWardrobe && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Enter an occasion above to get AI-curated outfit suggestions
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Based on your {wardrobeItems.length} wardrobe items
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Photo Warning */}
        {!personImage && outfitSuggestions.length > 0 && (
          <Card className="border-0 shadow-elegant bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                💡 Upload your photo in the <span className="font-medium">Try On</span> page to see yourself in these outfits
              </p>
            </CardContent>
          </Card>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
