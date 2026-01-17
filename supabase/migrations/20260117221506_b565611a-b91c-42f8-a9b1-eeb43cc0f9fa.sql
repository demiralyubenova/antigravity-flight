-- Add price column to clothing_items for cost-per-wear calculations
ALTER TABLE public.clothing_items ADD COLUMN price DECIMAL(10,2);

-- Add purchase_date for tracking when items were bought
ALTER TABLE public.clothing_items ADD COLUMN purchase_date DATE;