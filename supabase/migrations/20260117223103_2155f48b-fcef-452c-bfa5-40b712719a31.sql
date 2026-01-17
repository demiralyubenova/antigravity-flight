-- Add cold tolerance preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN cold_tolerance TEXT DEFAULT 'normal' CHECK (cold_tolerance IN ('cold-blooded', 'normal', 'warm-blooded'));

COMMENT ON COLUMN public.profiles.cold_tolerance IS 'User preference for temperature sensitivity: cold-blooded (feels cold easily), normal, warm-blooded (runs hot)';