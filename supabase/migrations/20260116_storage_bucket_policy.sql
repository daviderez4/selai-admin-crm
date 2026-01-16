-- Storage Bucket Policy for Marketing Assets
-- Run this in Supabase SQL Editor after creating the 'marketing-assets' bucket
--
-- IMPORTANT: You need to configure the bucket in the Supabase Dashboard:
-- 1. Go to Storage > marketing-assets bucket settings
-- 2. Make sure the bucket is set to PUBLIC for reading
-- 3. Create these policies through the Dashboard or run this SQL:

-- Create the bucket if it doesn't exist (set to public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-assets',
  'marketing-assets',
  true,
  104857600, -- 100MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates marketing" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes marketing" ON storage.objects;

-- Allow authenticated users to upload files to marketing-assets bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketing-assets');

-- Allow public read access to marketing-assets bucket
CREATE POLICY "Allow public read marketing assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing-assets');

-- Allow authenticated users to update files in marketing-assets bucket
CREATE POLICY "Allow authenticated updates marketing"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marketing-assets');

-- Allow authenticated users to delete files in marketing-assets bucket
CREATE POLICY "Allow authenticated deletes marketing"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketing-assets');
