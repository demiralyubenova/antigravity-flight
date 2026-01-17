import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Camera, Upload, Sparkles, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClothingItems } from '@/hooks/useClothingItems';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClothingItem, CATEGORY_LABELS } from '@/types/wardrobe';
import { cn } from '@/lib/utils';

export default function TryOn() {
  const { toast } = useToast();
  const { items } = useClothingItems('all');
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPersonImage(e.target?.result as string);
        setTryOnResult(null);
      };
      reader.readAsDataURL(file);
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
    setPersonImage(null);
    setTryOnResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
            </div>
          ) : (
            <label className="block aspect-[3/4] max-w-sm mx-auto rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer bg-muted/30">
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Upload Your Photo</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Take or upload a full-body photo
                </p>
                <Button variant="outline" size="sm" className="gap-2">
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
            </label>
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
