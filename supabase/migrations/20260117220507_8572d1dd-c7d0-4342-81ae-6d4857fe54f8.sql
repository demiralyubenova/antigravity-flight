-- Create trips table for travel/packing list feature
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip_outfits to link outfits to specific days of a trip
CREATE TABLE public.trip_outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
  planned_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add event_name column to outfits for named event planning
ALTER TABLE public.outfits ADD COLUMN event_name TEXT;

-- Add is_planned column to distinguish planned vs worn outfits
ALTER TABLE public.outfits ADD COLUMN is_planned BOOLEAN DEFAULT false;

-- Enable RLS on trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trips
CREATE POLICY "Users can view their own trips" 
  ON public.trips FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trips" 
  ON public.trips FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" 
  ON public.trips FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" 
  ON public.trips FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable RLS on trip_outfits
ALTER TABLE public.trip_outfits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trip_outfits (via trip ownership)
CREATE POLICY "Users can view their trip outfits" 
  ON public.trip_outfits FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.trips WHERE trips.id = trip_outfits.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their trip outfits" 
  ON public.trip_outfits FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips WHERE trips.id = trip_outfits.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their trip outfits" 
  ON public.trip_outfits FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.trips WHERE trips.id = trip_outfits.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their trip outfits" 
  ON public.trip_outfits FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.trips WHERE trips.id = trip_outfits.trip_id AND trips.user_id = auth.uid()
  ));

-- Add triggers for updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();