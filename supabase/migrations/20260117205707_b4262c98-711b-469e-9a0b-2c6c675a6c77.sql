-- Create try-on-results storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('try-on-results', 'try-on-results', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own try-on results
CREATE POLICY "Users can upload their own try-on results"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'try-on-results' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own try-on results
CREATE POLICY "Users can delete their own try-on results"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'try-on-results' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view try-on results (they're public)
CREATE POLICY "Try-on results are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'try-on-results');