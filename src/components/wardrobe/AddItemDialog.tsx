import { useState } from 'react';
import { Upload, X, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClothingCategory, ALL_CATEGORIES, CATEGORY_LABELS } from '@/types/wardrobe';
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

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: {
    name: string;
    category: ClothingCategory;
    image_url: string;
    color?: string;
    brand?: string;
  }) => void;
}

export function AddItemDialog({ open, onOpenChange, onAdd }: AddItemDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('tops');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  const removeBackground = async (base64Image: string): Promise<{ processedUrl: string; file: File } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('remove-background', {
        body: { imageUrl: base64Image },
      });

      if (error) throw error;

      if (data.processedImageUrl) {
        // Convert base64 to file
        const response = await fetch(data.processedImageUrl);
        const blob = await response.blob();
        const newFile = new File([blob], 'processed.png', { type: 'image/png' });
        
        return { processedUrl: data.processedImageUrl, file: newFile };
      }
      return null;
    } catch (error) {
      console.error('Error removing background:', error);
      return null;
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
    
    // Then remove background automatically
    toast({ title: 'Removing background...', description: 'AI is processing your image' });
    
    const result = await removeBackground(normalizedBase64);
    
    if (result) {
      setImagePreview(result.processedUrl);
      setImageFile(result.file);
      toast({ title: 'Background removed!', description: 'Your item is ready' });
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
        image_url: publicUrl,
        color: color || undefined,
        brand: brand || undefined,
      });

      // Reset form
      setName('');
      setCategory('tops');
      setColor('');
      setBrand('');
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
      <DialogContent className="sm:max-w-md">
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
              <SelectContent>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color & Brand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g., White"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Zara"
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
