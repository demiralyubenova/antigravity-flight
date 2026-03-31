import { useState, useEffect } from 'react';
import { Upload, X, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClothingCategory, ClothingSubcategory, ALL_CATEGORIES, CATEGORY_LABELS, SUBCATEGORY_OPTIONS } from '@/types/wardrobe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { removeBackground as removeBackgroundAI } from '@/services/ai-service';

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: {
    name: string;
    category: ClothingCategory;
    subcategory?: ClothingSubcategory;
    image_url: string;
    color?: string;
    brand?: string;
    price?: number;
    ai_description?: string;
  }) => void;
}

export function AddItemDialog({ open, onOpenChange, onAdd }: AddItemDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('tops');
  const [subcategory, setSubcategory] = useState<ClothingSubcategory | ''>('');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [aiDescription, setAiDescription] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategory('');
  }, [category]);

  const removeBackground = async (file: File): Promise<{ processedUrl: string; file: File } | null> => {
    try {
      // Use the Supabase edge function which connects to local rembg service
      const base64Result = await removeBackgroundAI(file, 'CLOTHING');

      if (base64Result) {
        // Convert base64 to File object for uploading to Supabase storage later
        const response = await fetch(base64Result);
        const blob = await response.blob();
        const newFile = new File([blob], 'processed.png', { type: 'image/png' });

        return { processedUrl: base64Result, file: newFile };
      }
      return null;
    } catch (error) {
      console.error('Error removing background:', error);
      return null;
    }
  };

  const analyzeClothing = async (base64Image: string) => {
    try {
      console.log('Invoking clothing analysis...');

      let data: any = null;
      let error: any = null;

      // 1. Try local Python service directly first (bypasses remote Supabase Edge Function)
      try {
        console.log('Attempting direct local analysis...');
        const fetchResponse = await fetch(base64Image);
        const blob = await fetchResponse.blob();

        const formData = new FormData();
        formData.append('file', blob, 'image.jpg');

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3011';
        // Note: Analysis service usually runs on port 8000 locally, but in production 
        // we use the same main backend URL which proxies or handles both.
        const localResponse = await fetch(`${backendUrl}/api/analyze`, {
          method: 'POST',
          body: formData,
        });

        if (localResponse.ok) {
          const result = await localResponse.json();
          console.log('Direct local analysis successful:', result);
          // Map local result to the expected format
          data = {
            name: result.name,
            category: result.category,
            type: result.type,
            color: result.color,
            confidence: result.confidence,
            ai_description: `${result.color.charAt(0).toUpperCase() + result.color.slice(1)} ${result.type} detected with ${Math.round(result.confidence * 100)}% confidence.`
          };
        } else {
          console.warn('Direct local analysis failed, falling back to edge function...');
        }
      } catch (localErr) {
        console.warn('Could not reach local service directly, falling back to edge function:', localErr);
      }

      // 2. Fallback to Supabase Edge Function if direct call failed
      if (!data) {
        console.log('Invoking analyze-clothing edge function...');
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('analyze-clothing', {
          body: { imageUrl: base64Image },
        });
        data = edgeData;
        error = edgeError;
      }

      if (error) {
        console.error('Analysis error:', error);
        throw error;
      }

      console.log('Analysis response data:', data);

      if (data && !data.error) {
        // Auto-fill the form fields
        if (data.name) setName(data.name);
        if (data.category && ALL_CATEGORIES.includes(data.category)) {
          setCategory(data.category as ClothingCategory);
          console.log('Setting category to:', data.category);
          // Auto-fill subcategory (type) if available and matches options for this category
          if (data.type) {
            console.log('Detecting type match for:', data.type);
            const typeMatch = SUBCATEGORY_OPTIONS[data.category as ClothingCategory].find(
              opt => opt.value === data.type.toLowerCase() || opt.label.toLowerCase() === data.type.toLowerCase()
            );
            if (typeMatch) {
              setSubcategory(typeMatch.value);
              console.log('Setting subcategory to:', typeMatch.value);
            }
          }
        }
        if (data.color) setColor(data.color);
        if (data.brand) setBrand(data.brand);
        if (data.ai_description) setAiDescription(data.ai_description);

        toast({ title: 'Item analyzed!', description: 'Details auto-filled from image' });
      } else if (data?.error) {
        console.error('Analysis logic error:', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error analyzing clothing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Analysis failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const normalizeImageOrientation = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          // Fallback to original
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        }
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingImage(true);

    // Normalize image orientation first (fixes upside-down mobile photos)
    const normalizedBase64 = await normalizeImageOrientation(file);
    setImagePreview(normalizedBase64); // Show normalized image immediately

    // Run background removal and AI analysis in parallel
    toast({ title: 'Processing image...', description: 'Removing background & analyzing item' });

    const [bgResult] = await Promise.all([
      removeBackground(file),
      analyzeClothing(normalizedBase64), // Auto-fill form fields
    ]);

    if (bgResult) {
      setImagePreview(bgResult.processedUrl);
      setImageFile(bgResult.file);
    } else {
      // If background removal fails, keep normalized image
      const response = await fetch(normalizedBase64);
      const blob = await response.blob();
      const normalizedFile = new File([blob], file.name, { type: 'image/jpeg' });
      setImageFile(normalizedFile);
      toast({
        title: 'Could not remove background',
        description: 'Using original image instead',
        variant: 'destructive'
      });
    }
    setProcessingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !user) return;

    setUploading(true);
    try {
      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('clothing')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('clothing')
        .getPublicUrl(fileName);

      // Add item
      onAdd({
        name,
        category,
        subcategory: subcategory || undefined,
        image_url: publicUrl,
        color: color || undefined,
        brand: brand || undefined,
        price: price ? parseFloat(price) : undefined,
        ai_description: aiDescription || undefined,
      });

      // Reset form
      setName('');
      setCategory('tops');
      setSubcategory('');
      setColor('');
      setBrand('');
      setPrice('');
      setAiDescription('');
      setImageFile(null);
      setImagePreview(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: 'Failed to add item', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add to Wardrobe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload */}
          <div>
            <Label>Photo</Label>
            {imagePreview ? (
              <div className="space-y-2 mt-2">
                <div className="relative aspect-[3/4] max-w-[200px] rounded-lg overflow-hidden bg-muted">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-white" />
                  {processingImage && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-xs font-medium">Removing background...</p>
                      </div>
                    </div>
                  )}
                  {!processingImage && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {!processingImage && imageFile && (
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <Sparkles className="h-3 w-3" />
                    <span>Background removed automatically</span>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload</span>
                <span className="text-xs text-muted-foreground mt-1">Background will be removed automatically</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., White Linen Shirt"
              className="mt-1.5"
              required
            />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ClothingCategory)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200] bg-popover">
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory */}
          <div>
            <Label>Type</Label>
            <Select
              value={subcategory || undefined}
              onValueChange={(v) => setSubcategory(v as ClothingSubcategory)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select type (optional)" />
              </SelectTrigger>
              <SelectContent className="z-[200] bg-popover">
                {SUBCATEGORY_OPTIONS[category].map((sub) => (
                  <SelectItem key={sub.value} value={sub.value}>
                    {sub.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color, Brand & Price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="White"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Zara"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="$49"
                className="mt-1.5"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!imageFile || !name || uploading || processingImage}
          >
            {uploading ? 'Uploading...' : 'Add Item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
