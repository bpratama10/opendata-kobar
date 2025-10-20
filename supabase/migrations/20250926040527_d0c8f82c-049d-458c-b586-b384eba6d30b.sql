-- Create publication status enum
CREATE TYPE public.publication_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- Add missing fields to catalog_metadata table
ALTER TABLE public.catalog_metadata 
ADD COLUMN IF NOT EXISTS publication_status publication_status DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS license_code varchar REFERENCES public.lisensi(code),
ADD COLUMN IF NOT EXISTS update_frequency_code varchar REFERENCES public.freq_upd(code);

-- Migrate existing is_published data to publication_status
UPDATE public.catalog_metadata 
SET publication_status = CASE 
  WHEN is_published = true THEN 'PUBLISHED'::publication_status
  ELSE 'DRAFT'::publication_status
END;

-- Update RLS policies to use publication_status instead of is_published
DROP POLICY IF EXISTS "Organization-based dataset viewing" ON public.catalog_metadata;
DROP POLICY IF EXISTS "Public datasets are viewable by everyone" ON public.catalog_metadata;

-- Create new policies with publication_status
CREATE POLICY "Organization-based dataset viewing" 
ON public.catalog_metadata 
FOR SELECT 
USING (
  (publication_status = 'PUBLISHED' AND classification_code = 'PUBLIC'::classification_type) OR 
  (auth.uid() IS NOT NULL AND publisher_org_id = get_user_org_id()) OR 
  has_admin_or_walidata_role()
);

CREATE POLICY "Public datasets are viewable by everyone" 
ON public.catalog_metadata 
FOR SELECT 
USING (publication_status = 'PUBLISHED' AND classification_code = 'PUBLIC'::classification_type);

-- Update resource policies to use publication_status
DROP POLICY IF EXISTS "Public resources are viewable by everyone" ON public.catalog_resources;
CREATE POLICY "Public resources are viewable by everyone" 
ON public.catalog_resources 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM catalog_metadata 
  WHERE catalog_metadata.id = catalog_resources.dataset_id 
    AND catalog_metadata.classification_code = 'PUBLIC'::classification_type 
    AND catalog_metadata.publication_status = 'PUBLISHED'
));

-- Update distribution policies to use publication_status  
DROP POLICY IF EXISTS "Public distributions are viewable by everyone" ON public.catalog_distributions;
CREATE POLICY "Public distributions are viewable by everyone" 
ON public.catalog_distributions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM catalog_resources r
  JOIN catalog_metadata m ON r.dataset_id = m.id
  WHERE r.id = catalog_distributions.resource_id 
    AND m.classification_code = 'PUBLIC'::classification_type 
    AND m.publication_status = 'PUBLISHED'
));

-- Update data tables policies to use publication_status
DROP POLICY IF EXISTS "Public indicators are viewable by everyone" ON public.data_indicators;
CREATE POLICY "Public indicators are viewable by everyone" 
ON public.data_indicators 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM catalog_resources r
  JOIN catalog_metadata m ON r.dataset_id = m.id
  WHERE r.id = data_indicators.resource_id 
    AND m.classification_code = 'PUBLIC'::classification_type 
    AND m.publication_status = 'PUBLISHED'
));

DROP POLICY IF EXISTS "Public data points are viewable by everyone" ON public.data_points;
CREATE POLICY "Public data points are viewable by everyone" 
ON public.data_points 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM catalog_resources r
  JOIN catalog_metadata m ON r.dataset_id = m.id
  WHERE r.id = data_points.resource_id 
    AND m.classification_code = 'PUBLIC'::classification_type 
    AND m.publication_status = 'PUBLISHED'
));

DROP POLICY IF EXISTS "Public table view columns are viewable by everyone" ON public.data_table_view_columns;
CREATE POLICY "Public table view columns are viewable by everyone" 
ON public.data_table_view_columns 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM catalog_resources r
  JOIN catalog_metadata m ON r.dataset_id = m.id
  WHERE r.id = data_table_view_columns.resource_id 
    AND m.classification_code = 'PUBLIC'::classification_type 
    AND m.publication_status = 'PUBLISHED'
));