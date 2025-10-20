-- Add icon_url column to catalog_themes table
ALTER TABLE public.catalog_themes 
ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN public.catalog_themes.icon_url IS 'URL or path to theme icon (SVG/PNG)';

-- Update RLS policies to allow authenticated users to update and delete themes
DROP POLICY IF EXISTS "Authenticated users can update themes" ON public.catalog_themes;
DROP POLICY IF EXISTS "Authenticated users can delete themes" ON public.catalog_themes;

CREATE POLICY "Authenticated users can update themes"
ON public.catalog_themes
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete themes"
ON public.catalog_themes
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);