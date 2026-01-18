-- Create outfit feedback table for AI learning
CREATE TABLE public.outfit_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outfit_item_ids TEXT[] NOT NULL,
  occasion TEXT,
  rating TEXT CHECK (rating IN ('love', 'meh', 'hate')),
  temperature_feedback TEXT CHECK (temperature_feedback IN ('too_warm', 'just_right', 'too_cold')),
  formality_feedback TEXT CHECK (formality_feedback IN ('too_formal', 'just_right', 'too_casual')),
  more_like_this BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own feedback"
ON public.outfit_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback"
ON public.outfit_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
ON public.outfit_feedback FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
ON public.outfit_feedback FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_outfit_feedback_user_id ON public.outfit_feedback(user_id);
CREATE INDEX idx_outfit_feedback_rating ON public.outfit_feedback(rating);