-- Add wear tracking to clothing items
ALTER TABLE public.clothing_items 
ADD COLUMN wear_count integer NOT NULL DEFAULT 0,
ADD COLUMN last_worn_at timestamp with time zone;

-- Add outfit metadata for similarity tracking
ALTER TABLE public.outfits
ADD COLUMN color_palette text[] DEFAULT '{}',
ADD COLUMN silhouette text,
ADD COLUMN similarity_hash text;

-- Create index for faster similarity queries
CREATE INDEX idx_outfits_similarity_hash ON public.outfits(similarity_hash);
CREATE INDEX idx_outfits_user_worn ON public.outfits(user_id, worn_at DESC);
CREATE INDEX idx_clothing_items_wear ON public.clothing_items(user_id, wear_count DESC);