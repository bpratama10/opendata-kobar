-- Create storage bucket for theme icons
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'theme-icons',
  'theme-icons',
  true,
  2097152, -- 2MB limit
  ARRAY['image/svg+xml', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for theme-icons bucket
CREATE POLICY "Anyone can view theme icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'theme-icons');

CREATE POLICY "Authenticated users can upload theme icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'theme-icons' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update theme icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'theme-icons' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete theme icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'theme-icons' 
  AND auth.uid() IS NOT NULL
);