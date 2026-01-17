-- Create wishlist items table
CREATE TABLE public.wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  target_price DECIMAL(10,2),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  source TEXT, -- 'gap_detection', 'manual', 'outfit_completion'
  related_outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
  is_purchased BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own wishlist" 
  ON public.wishlist_items FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist items" 
  ON public.wishlist_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlist items" 
  ON public.wishlist_items FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items" 
  ON public.wishlist_items FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_wishlist_items_updated_at
  BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();