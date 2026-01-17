import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Eye, RefreshCw, AlertTriangle, ShoppingBag } from 'lucide-react';
import { useClothingItems } from '@/hooks/useClothingItems';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClothingItem } from '@/types/wardrobe';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface OutfitSuggestion {
  name: string;
  description: string;
  itemIds: string[];
  items?: ClothingItem[];
}

export default function Create() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: wardrobeItems } = useClothingItems('all');
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [tryOnLoading, setTryOnLoading] = useState<number | null>(null);
  const [outfitSuggestions, setOutfitSuggestions] = useState<OutfitSuggestion[]>([]);
  const [tryOnResults, setTryOnResults] = useState<Record<number, string>>({});
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [recentOutfits, setRecentOutfits] = useState<any[]>([]);
  const [insufficientWardrobe, setInsufficientWardrobe] = useState<{ insufficient: boolean; missingItems: string[] } | null>(null);

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
    setOutfitSuggestions([]);
    setTryOnResults({});
    setInsufficientWardrobe(null);

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
        toast({ title: '✨ 3 outfit options ready!' });
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

  const handleTryOn = async (index: number) => {
    const outfit = outfitSuggestions[index];
    
    if (!personImage) {
      toast({ 
        title: 'No photo found', 
        description: 'Please upload your photo in the Try On page first',
        variant: 'destructive' 
      });
      return;
    }

    if (!outfit.items || outfit.items.length === 0) {
      toast({ title: 'No items in this outfit', variant: 'destructive' });
      return;
    }

    setTryOnLoading(index);
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
        setTryOnResults(prev => ({ ...prev, [index]: data.tryOnImageUrl }));
        toast({ title: 'Try-on complete!' });
      }
    } catch (error: any) {
      console.error('Error in outfit try-on:', error);
      toast({ 
        title: 'Try-on failed', 
        description: error.message || 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setTryOnLoading(null);
    }
  };

  return (
    <AppLayout title="Outfit Creator" subtitle="AI-powered outfit suggestions">
      <div className="pb-24 space-y-6">
        {/* Occasion Input */}
        <div className="px-4 space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-display font-semibold text-foreground">
              What's the occasion?
            </h2>
            <p className="text-sm text-muted-foreground">
              Tell me where you're going and I'll create 3 outfit options from your wardrobe
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="e.g., Business meeting, date night..."
              className="flex-1 h-12"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateOutfits()}
            />
            <Button 
              onClick={handleGenerateOutfits} 
              disabled={!occasion || loading} 
              className="h-12 px-6 gap-2"
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
          <div className="flex flex-wrap gap-2 justify-center">
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
        </div>

        {/* Loading State */}
        {loading && (
          <div className="px-4">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
                <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
              </div>
              <p className="text-muted-foreground animate-pulse">
                Creating your perfect outfits...
              </p>
            </div>
          </div>
        )}

        {/* Insufficient Wardrobe Warning */}
        {insufficientWardrobe?.insufficient && (
          <div className="px-4">
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-display font-semibold text-foreground">
                      Your wardrobe needs more items
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      You don't have enough suitable items for <span className="font-medium text-foreground">{occasion}</span>. Here's what you're missing:
                    </p>
                  </div>
                </div>
                
                {insufficientWardrobe.missingItems.length > 0 && (
                  <div className="space-y-2 pl-13">
                    <p className="text-sm font-medium text-foreground">Suggested items to add:</p>
                    <ul className="space-y-1">
                      {insufficientWardrobe.missingItems.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShoppingBag className="h-3 w-3 text-primary" />
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
                    className="gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Go to Wardrobe
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
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
          </div>
        )}
        {/* Outfit Suggestions */}
        {outfitSuggestions.length > 0 && (
          <div className="px-4 space-y-4">
            <div className="flex items-center justify-between">
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
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-4 space-y-4">
                    {/* Outfit Header */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          {index + 1}
                        </span>
                        <h4 className="font-display font-semibold text-foreground">
                          {outfit.name}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground pl-8">
                        {outfit.description}
                      </p>
                    </div>

                    {/* Outfit Items */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {outfit.items?.map((item) => (
                        <div key={item.id} className="flex-shrink-0">
                          <div className="w-20 h-24 rounded-lg overflow-hidden bg-muted border-2 border-border">
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <p className="text-xs text-center mt-1 truncate w-20 text-muted-foreground">
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Try On Result */}
                    {tryOnResults[index] && (
                      <div className="relative aspect-[3/4] max-w-xs mx-auto rounded-xl overflow-hidden bg-muted">
                        <img 
                          src={tryOnResults[index]} 
                          alt={`${outfit.name} try-on`} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
                            <span className="text-xs font-medium text-primary">✨ Your Look</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Try On Button */}
                    <Button
                      onClick={() => handleTryOn(index)}
                      disabled={tryOnLoading !== null || !personImage}
                      variant={tryOnResults[index] ? "secondary" : "default"}
                      className="w-full gap-2"
                    >
                      {tryOnLoading === index ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating your look...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          {tryOnResults[index] ? 'Try On Again' : 'Try On This Outfit'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && outfitSuggestions.length === 0 && (
          <div className="px-4 py-12">
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
          </div>
        )}

        {/* No Photo Warning */}
        {!personImage && outfitSuggestions.length > 0 && (
          <div className="px-4">
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                💡 Upload your photo in the <span className="font-medium">Try On</span> page to see yourself in these outfits
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
