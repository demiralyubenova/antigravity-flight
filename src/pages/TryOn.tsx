import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Camera, Upload, Sparkles, X, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClothingItems } from '@/hooks/useClothingItems';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ClothingItem, CATEGORY_LABELS } from '@/types/wardrobe';
import { cn } from '@/lib/utils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved avatar on mount
  useEffect(() => {
    if (!user) return;
    
    const loadAvatar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setSavedAvatarUrl(data.avatar_url);
        setPersonImage(data.avatar_url);
      }
    };
    
    loadAvatar();
  }, [user]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use createImageBitmap + canvas to normalize EXIF orientation
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
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const saveAsAvatar = async () => {
    if (!personImage || !user) return;
    
    setSavingAvatar(true);
    try {
      // Convert base64 to blob
      const response = await fetch(personImage);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
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

  const handleTryOn = async () => {
    if (!personImage || !selectedItem) return;

    setProcessing(true);
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
        toast({ title: 'Try-on complete!' });
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

  const clearPersonImage = () => {
    setPersonImage(savedAvatarUrl); // Reset to saved avatar if available
    setTryOnResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isNewPhoto = personImage && personImage !== savedAvatarUrl && personImage.startsWith('data:');

  return (
    <AppLayout title="Fitting Mirror" subtitle="Virtual try-on experience">
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
                    onClick={() => setSelectedItem(item)}
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
      {personImage && selectedItem && (
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
