-- Create try_on_results table to persist virtual try-on results
CREATE TABLE public.try_on_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person_image_url TEXT NOT NULL,
  clothing_item_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  result_image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.try_on_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own try-on results
CREATE POLICY "Users can view their own try-on results"
ON public.try_on_results FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own try-on results
CREATE POLICY "Users can insert their own try-on results"
ON public.try_on_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own try-on results
CREATE POLICY "Users can delete their own try-on results"
ON public.try_on_results FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_try_on_results_user_id ON public.try_on_results(user_id);
CREATE INDEX idx_try_on_results_created_at ON public.try_on_results(created_at DESC);