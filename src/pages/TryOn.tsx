import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Camera, Upload, Sparkles, X, Loader2, Save, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClothingItems } from '@/hooks/useClothingItems';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ClothingItem, CATEGORY_LABELS } from '@/types/wardrobe';
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
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savedResults, setSavedResults] = useState<TryOnResult[]>([]);
  const [selectedSavedResult, setSelectedSavedResult] = useState<TryOnResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!user || !selectedItem) return null;

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

      // Save to database with storage URL
      const { data, error } = await supabase
        .from('try_on_results')
        .insert({
          user_id: user.id,
          person_image_url: savedAvatarUrl || '',
          clothing_item_id: selectedItem.id,
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
    if (!personImage || !selectedItem) return;

    setProcessing(true);
    setSelectedSavedResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: {
          personImageUrl: personImage,
          clothingImageUrl: selectedItem.image_url,
          clothingType: CATEGORY_LABELS[selectedItem.category],
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
      setSelectedItem(matchingItem);
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

  const isNewPhoto = personImage && personImage !== savedAvatarUrl && personImage.startsWith('data:');

  return (
    <AppLayout title="Fitting Mirror" subtitle="Virtual try-on experience">
      {/* Saved Looks History */}
      {savedResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display text-sm font-medium text-muted-foreground">Your Saved Looks</h3>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-3">
              {savedResults.map((result) => (
                <div key={result.id} className="relative group flex-shrink-0">
                  <button
                    onClick={() => viewSavedResult(result)}
                    className={cn(
                      "w-20 h-28 rounded-lg overflow-hidden border-2 transition-all",
                      selectedSavedResult?.id === result.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-primary/30"
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
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 pb-24">
        {/* Left: Person Photo Upload */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-medium">Your Photo</h3>
          
          {personImage ? (
            <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted">
              <img
                src={tryOnResult || personImage}
                alt="Your photo"
                className="w-full h-full object-cover"
              />
              {!processing && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-3 right-3"
                  onClick={clearPersonImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {processing && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    <p className="text-sm font-medium">Creating your look...</p>
                  </div>
                </div>
              )}
              {tryOnResult && (
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                    <span className="text-sm font-medium text-primary">✨ Virtual Try-On Result</span>
                  </div>
                </div>
              )}
              {isNewPhoto && !tryOnResult && !processing && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-3 left-3 right-3 gap-2"
                  onClick={saveAsAvatar}
                  disabled={savingAvatar}
                >
                  {savingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingAvatar ? 'Saving...' : 'Save as my photo'}
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
              className="block aspect-[3/4] max-w-sm mx-auto rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer bg-muted/30"
            >
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Upload Your Photo</h4>
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>

        {/* Right: Select Clothing */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-medium">Select Clothing</h3>
          
          {items.length === 0 ? (
            <div className="aspect-[3/4] max-w-sm mx-auto rounded-2xl border border-border bg-muted/30 flex items-center justify-center">
              <div className="text-center p-6">
                <p className="text-muted-foreground text-sm">
                  Add items to your wardrobe first
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected item preview */}
              {selectedItem && (
                <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted border-2 border-primary">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                    <p className="font-medium">{selectedItem.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORY_LABELS[selectedItem.category]}
                    </p>
                  </div>
                </div>
              )}

              {/* Clothing grid */}
              <div className="grid grid-cols-4 gap-2">
                {items.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setTryOnResult(null);
                      setSelectedSavedResult(null);
                    }}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      selectedItem?.id === item.id
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

              {items.length > 8 && (
                <p className="text-xs text-center text-muted-foreground">
                  Showing 8 of {items.length} items
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Try On Button */}
      {personImage && selectedItem && !selectedSavedResult && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            onClick={handleTryOn}
            disabled={processing}
            className="w-full max-w-md mx-auto h-14 text-lg gap-3"
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
                Try It On
              </>
            )}
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
