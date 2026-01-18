-- Fix storage RLS policies for clothing bucket
-- First, ensure the bucket exists with public access
INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing', 'clothing', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload clothing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view clothing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their clothing images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view clothing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload clothing images" ON storage.objects;

-- Create new policies for the clothing bucket
-- Anyone can view images (since bucket is public)
CREATE POLICY "Anyone can view clothing images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'clothing');

-- Authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload clothing images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'clothing' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own images
CREATE POLICY "Users can update their clothing images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'clothing' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own images
CREATE POLICY "Users can delete their clothing images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'clothing' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);