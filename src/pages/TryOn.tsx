import { useState, useRef, useEffect, useMemo, type ChangeEvent } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Camera, Upload, Sparkles, X, Loader2, Save, History, Trash2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useClothingItems } from '@/hooks/useClothingItems';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ClothingItem, ClothingCategory, ClothingSubcategory, CATEGORY_LABELS, ALL_CATEGORIES, SUBCATEGORY_OPTIONS } from '@/types/wardrobe';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface TryOnResult {
  id: string;
  result_image_url: string;
  clothing_item_id: string | null;
  created_at: string;
}

export default function TryOn() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { items } = useClothingItems('all');
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savedResults, setSavedResults] = useState<TryOnResult[]>([]);
  const [selectedSavedResult, setSelectedSavedResult] = useState<TryOnResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filtering state
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<ClothingSubcategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on category, subcategory, and search
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Filter by category
    if (activeCategory !== 'all') {
      result = result.filter(item => item.category === activeCategory);
    }
    
    // Filter by subcategory
    if (activeSubcategory !== 'all') {
      result = result.filter(item => item.subcategory === activeSubcategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.color?.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, activeCategory, activeSubcategory, searchQuery]);

  // Reset subcategory when category changes
  const handleCategoryChange = (category: ClothingCategory | 'all') => {
    setActiveCategory(category);
    setActiveSubcategory('all');
  };

  // Toggle item selection
  const toggleItemSelection = (item: ClothingItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        // Limit to 4 items max for performance
        if (prev.length >= 4) {
          toast({ title: 'Maximum 4 items', description: 'Remove an item to add another', variant: 'destructive' });
          return prev;
        }
        return [...prev, item];
      }
    });
    setTryOnResult(null);
    setSelectedSavedResult(null);
  };

  // Load saved avatar and try-on history on mount
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      // Load avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile?.avatar_url) {
        setSavedAvatarUrl(profile.avatar_url);
        setPersonImage(profile.avatar_url);
      }

      // Load saved try-on results
      const { data: results } = await supabase
        .from('try_on_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (results) {
        setSavedResults(results);
      }
    };
    
    loadData();
  }, [user]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const normalizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPersonImage(normalizedDataUrl);
        setTryOnResult(null);
        setSelectedSavedResult(null);
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const saveAsAvatar = async () => {
    if (!personImage || !user) return;
    
    setSavingAvatar(true);
    try {
      const response = await fetch(personImage);
      const blob = await response.blob();
      
      const fileName = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          user_id: user.id, 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      setSavedAvatarUrl(publicUrl);
      toast({ title: 'Photo saved!', description: 'This will be your default try-on photo' });
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast({ title: 'Failed to save photo', variant: 'destructive' });
    } finally {
      setSavingAvatar(false);
    }
  };

  const saveTryOnResult = async (resultBase64: string): Promise<string | null> => {
    if (!user || selectedItems.length === 0) return null;

    try {
      // Convert base64 to blob and upload to storage
      const response = await fetch(resultBase64);
      const blob = await response.blob();
      
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('try-on-results')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('try-on-results')
        .getPublicUrl(fileName);

      // Save to database with storage URL (using first item for compatibility)
      const { data, error } = await supabase
        .from('try_on_results')
        .insert({
          user_id: user.id,
          person_image_url: savedAvatarUrl || '',
          clothing_item_id: selectedItems[0].id,
          result_image_url: publicUrl,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSavedResults(prev => [data, ...prev]);
      }
      
      return publicUrl;
    } catch (error) {
      console.error('Error saving try-on result:', error);
      return null;
    }
  };

  const handleTryOn = async () => {
    if (!personImage || selectedItems.length === 0) return;

    setProcessing(true);
    setSelectedSavedResult(null);
    
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
        toast({ title: 'Try-on complete!', description: 'Saving to your history...' });
        
        // Save result to storage and database
        const savedUrl = await saveTryOnResult(data.tryOnImageUrl);
        if (savedUrl) {
          setTryOnResult(savedUrl); // Update to use the persistent URL
        }
      }
    } catch (error) {
      console.error('Error in virtual try-on:', error);
      toast({
        title: 'Try-on failed',
        description: 'Please try again with a different image.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const deleteSavedResult = async (resultId: string) => {
    try {
      const { error } = await supabase
        .from('try_on_results')
        .delete()
        .eq('id', resultId);

      if (error) throw error;

      setSavedResults(prev => prev.filter(r => r.id !== resultId));
      
      if (selectedSavedResult?.id === resultId) {
        setSelectedSavedResult(null);
        setTryOnResult(null);
      }
      
      toast({ title: 'Look deleted' });
    } catch (error) {
      console.error('Error deleting result:', error);
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const viewSavedResult = (result: TryOnResult) => {
    setSelectedSavedResult(result);
    setTryOnResult(result.result_image_url);
    
    // Find and select the matching clothing item
    const matchingItem = items.find(item => item.id === result.clothing_item_id);
    if (matchingItem) {
      setSelectedItems([matchingItem]);
    }
  };

  const clearPersonImage = () => {
    setPersonImage(savedAvatarUrl);
    setTryOnResult(null);
    setSelectedSavedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearSelectedItems = () => {
    setSelectedItems([]);
    setTryOnResult(null);
    setSelectedSavedResult(null);
  };

  const isNewPhoto = personImage && personImage !== savedAvatarUrl && personImage.startsWith('data:');

  return (
    <AppLayout title="Fitting Mirror" subtitle="Virtual try-on experience">
      <div className="space-y-6 pb-32">
        {/* Saved Looks History */}
        {savedResults.length > 0 && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-medium">Your Saved Looks</h3>
              </div>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-2">
                  {savedResults.map((result) => (
                    <div key={result.id} className="relative group flex-shrink-0">
                      <button
                        onClick={() => viewSavedResult(result)}
                        className={cn(
                          "w-20 h-28 rounded-xl overflow-hidden border-2 transition-all shadow-sm",
                          selectedSavedResult?.id === result.id
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <img
                          src={result.result_image_url}
                          alt="Saved look"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedResult(result.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Your Photo Card */}
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-5">
            <h3 className="font-display text-lg font-medium tracking-tight mb-4">Your Photo</h3>
            
            {personImage ? (
              <div className="relative">
                {/* Person photo stays visible */}
                <div className="relative aspect-[3/4] max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted border border-border">
                  <img
                    src={personImage}
                    alt="Your uploaded photo"
                    className="w-full h-full object-cover"
                  />
                  {!processing && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg"
                      onClick={clearPersonImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {processing && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                        <p className="text-sm font-medium">Creating your look...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Result shown separately so photo doesn't get replaced */}
                {tryOnResult && (
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-2 mb-3 text-primary">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">Virtual Try-On Result</span>
                    </div>
                    <div className="relative aspect-[3/4] max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted border border-border">
                      <img
                        src={tryOnResult}
                        alt="Virtual try-on result"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {isNewPhoto && !tryOnResult && !processing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full max-w-xs mx-auto mt-4 gap-2"
                    onClick={saveAsAvatar}
                    disabled={savingAvatar}
                  >
                    {savingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingAvatar ? 'Saving...' : 'Save as my default photo'}
                  </Button>
                )}
              </div>
            ) : (
                {isNewPhoto && !tryOnResult && !processing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full max-w-xs mx-auto mt-4 gap-2"
                    onClick={saveAsAvatar}
                    disabled={savingAvatar}
                  >
                    {savingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingAvatar ? 'Saving...' : 'Save as my default photo'}
                  </Button>
                )}
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openFilePicker();
                  }
                }}
                className="aspect-[3/4] max-w-xs mx-auto rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer bg-muted/30"
              >
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-display font-medium mb-1">Upload Your Photo</h4>
                  <p className="text-sm text-muted-foreground mb-4">Take or upload a full-body photo</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openFilePicker();
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Choose Photo
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        {/* Select Clothing Card */}
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-medium tracking-tight">Select Outfit</h3>
              {selectedItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelectedItems} className="text-muted-foreground">
                  Clear ({selectedItems.length})
                </Button>
              )}
            </div>
            
            {items.length === 0 ? (
              <div className="aspect-[3/4] max-w-xs mx-auto rounded-2xl border border-border bg-muted/30 flex items-center justify-center">
                <div className="text-center p-6">
                  <p className="text-muted-foreground text-sm">
                    Add items to your wardrobe first
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected items preview */}
                {selectedItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Selected items:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedItems.map((item) => (
                        <Badge 
                          key={item.id} 
                          variant="secondary" 
                          className="gap-1.5 py-1.5 pl-1.5 pr-2"
                        >
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-6 h-6 rounded object-cover"
                          />
                          <span className="max-w-[100px] truncate">{item.name}</span>
                          <button 
                            onClick={() => toggleItemSelection(item)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clothes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category tabs */}
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-2 pb-2">
                    <button
                      onClick={() => handleCategoryChange('all')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                        activeCategory === 'all'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      )}
                    >
                      All
                    </button>
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                          activeCategory === cat
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        )}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* Subcategory tabs */}
                {activeCategory !== 'all' && (
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-1.5 pb-2">
                      <button
                        onClick={() => setActiveSubcategory('all')}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                          activeSubcategory === 'all'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        All
                      </button>
                      {SUBCATEGORY_OPTIONS[activeCategory].map((sub) => (
                        <button
                          key={sub.value}
                          onClick={() => setActiveSubcategory(sub.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                            activeSubcategory === sub.value
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}

                {/* Clothing grid */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {filteredItems.length === 0 
                      ? 'No items found' 
                      : `Tap to select multiple items (max 4)`}
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {filteredItems.map((item) => {
                      const isSelected = selectedItems.some(i => i.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItemSelection(item)}
                          className={cn(
                            "relative aspect-square rounded-xl overflow-hidden border-2 transition-all shadow-sm",
                            isSelected
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Try On Button */}
        {personImage && selectedItems.length > 0 && !selectedSavedResult && (
          <div className="flex justify-center py-4">
            <Button
              onClick={handleTryOn}
              disabled={processing}
              className="w-full max-w-md h-14 text-lg gap-3 rounded-2xl shadow-elegant-lg"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Try On {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
