import { useState } from 'react';
import { Upload, X, Loader2, Wand2 } from 'lucide-react';
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
  const [removingBackground, setRemovingBackground] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeBackground = async () => {
    if (!imagePreview) return;

    setRemovingBackground(true);
    try {
      const { data, error } = await supabase.functions.invoke('remove-background', {
        body: { imageUrl: imagePreview },
      });

      if (error) throw error;

      if (data.processedImageUrl) {
        setImagePreview(data.processedImageUrl);
        
        // Convert base64 to file
        const response = await fetch(data.processedImageUrl);
        const blob = await response.blob();
        const newFile = new File([blob], imageFile?.name || 'processed.png', { type: 'image/png' });
        setImageFile(newFile);
        
        toast({ title: 'Background removed successfully!' });
      }
    } catch (error) {
      console.error('Error removing background:', error);
      toast({ 
        title: 'Failed to remove background', 
        description: 'Please try again or continue with the original image.',
        variant: 'destructive' 
      });
    } finally {
      setRemovingBackground(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !user) return;

    setUploading(true);
    try {
      // Upload image to storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
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
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={clearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeBackground}
                  disabled={removingBackground}
                  className="gap-2"
                >
                  {removingBackground ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing background...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Remove Background
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload</span>
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
            disabled={!imageFile || !name || uploading || removingBackground}
          >
            {uploading ? 'Uploading...' : 'Add Item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
