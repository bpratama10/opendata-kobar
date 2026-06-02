-- Add columns to catalog_metadata
ALTER TABLE public.catalog_metadata 
ADD COLUMN metadata_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
ADD COLUMN data_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
ADD COLUMN last_published_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

-- Add status column to data_points and data_indicators
ALTER TABLE public.data_points 
ADD COLUMN status public.publication_status NOT NULL DEFAULT 'DRAFT';

ALTER TABLE public.data_indicators 
ADD COLUMN status public.publication_status NOT NULL DEFAULT 'DRAFT';

-- Add grace_period_months to freq_upd
ALTER TABLE public.freq_upd 
ADD COLUMN grace_period_months INTEGER NOT NULL DEFAULT 0;

-- Update existing data points and indicators to PUBLISHED status
-- We temporarily disable the update metadata triggers to prevent cascading checks
ALTER TABLE public.data_points DISABLE TRIGGER trg_data_points_update_metadata;
ALTER TABLE public.data_indicators DISABLE TRIGGER trg_data_indicators_update_metadata;

UPDATE public.data_points SET status = 'PUBLISHED';
UPDATE public.data_indicators SET status = 'PUBLISHED';

ALTER TABLE public.data_points ENABLE TRIGGER trg_data_points_update_metadata;
ALTER TABLE public.data_indicators ENABLE TRIGGER trg_data_indicators_update_metadata;

-- Seed grace periods for frequencies
UPDATE public.freq_upd SET grace_period_months = 6 WHERE code = 'TAH';
UPDATE public.freq_upd SET grace_period_months = 2 WHERE code = 'SEM';
UPDATE public.freq_upd SET grace_period_months = 1 WHERE code = 'TRI';
UPDATE public.freq_upd SET grace_period_months = 0 WHERE code IN ('BLN', 'HAR', 'HUB');

-- Trigger to automatically set DRAFT status for PRODUSEN modifications
CREATE OR REPLACE FUNCTION public.set_data_point_indicator_draft_status()
RETURNS TRIGGER AS $$
BEGIN
  IF has_role('PRODUSEN') THEN
    NEW.status := 'DRAFT';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_data_points_set_status_draft
BEFORE INSERT OR UPDATE ON public.data_points
FOR EACH ROW EXECUTE FUNCTION public.set_data_point_indicator_draft_status();

CREATE TRIGGER trg_data_indicators_set_status_draft
BEFORE INSERT OR UPDATE ON public.data_indicators
FOR EACH ROW EXECUTE FUNCTION public.set_data_point_indicator_draft_status();

-- Modify metadata update trigger on resource changes
CREATE OR REPLACE FUNCTION public.update_catalog_metadata_updated_at_from_resource()
RETURNS TRIGGER AS $$
DECLARE
  _dataset_id UUID;
BEGIN
  SELECT dataset_id INTO _dataset_id
  FROM public.catalog_resources
  WHERE id = NEW.resource_id;
  
  IF _dataset_id IS NULL AND TG_OP = 'DELETE' THEN
    SELECT dataset_id INTO _dataset_id
    FROM public.catalog_resources
    WHERE id = OLD.resource_id;
  END IF;

  IF _dataset_id IS NOT NULL THEN
    UPDATE public.catalog_metadata
    SET data_updated_at = now()
    WHERE id = _dataset_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to check criticality of dataset updates & manage auto-approve
CREATE OR REPLACE FUNCTION public.check_dataset_update_criticality()
RETURNS TRIGGER AS $$
BEGIN
  -- If publication status transitions to PUBLISHED
  IF NEW.publication_status = 'PUBLISHED' AND OLD.publication_status IS DISTINCT FROM 'PUBLISHED' THEN
    NEW.last_published_at := now();
  END IF;

  -- If dataset was published, and updater is PRODUSEN
  IF OLD.publication_status = 'PUBLISHED' AND has_role('PRODUSEN') THEN
    -- Check if classification level or data tables were touched
    IF NEW.classification_code IS DISTINCT FROM OLD.classification_code OR
       NEW.data_updated_at IS DISTINCT FROM OLD.data_updated_at THEN
      NEW.publication_status := 'PENDING_REVIEW';
    ELSE
      -- Keep published (Auto-approve non-critical updates)
      NEW.publication_status := 'PUBLISHED';
    END IF;
  END IF;
  
  -- Prevent PRODUSEN from manually changing status to PUBLISHED from other states
  IF has_role('PRODUSEN') THEN
    IF OLD.publication_status IS DISTINCT FROM 'PUBLISHED' AND NEW.publication_status = 'PUBLISHED' THEN
      NEW.publication_status := OLD.publication_status;
    END IF;
  END IF;

  -- Update metadata_updated_at if metadata fields are changed
  IF NEW.title IS DISTINCT FROM OLD.title OR
     NEW.slug IS DISTINCT FROM OLD.slug OR
     NEW.abstract IS DISTINCT FROM OLD.abstract OR
     NEW.description IS DISTINCT FROM OLD.description OR
     NEW.contact_email IS DISTINCT FROM OLD.contact_email OR
     NEW.language IS DISTINCT FROM OLD.language OR
     NEW.license_code IS DISTINCT FROM OLD.license_code OR
     NEW.update_frequency_code IS DISTINCT FROM OLD.update_frequency_code OR
     NEW.temporal_start IS DISTINCT FROM OLD.temporal_start OR
     NEW.temporal_end IS DISTINCT FROM OLD.temporal_end OR
     NEW.keywords IS DISTINCT FROM OLD.keywords OR
     NEW.publisher_org_id IS DISTINCT FROM OLD.publisher_org_id THEN
     
     NEW.metadata_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_catalog_metadata_critical_check
BEFORE UPDATE ON public.catalog_metadata
FOR EACH ROW EXECUTE FUNCTION public.check_dataset_update_criticality();

-- Trigger function for publication transition (publish drafts)
CREATE OR REPLACE FUNCTION public.handle_dataset_publication_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.publication_status = 'PUBLISHED' AND (OLD.publication_status IS DISTINCT FROM 'PUBLISHED' OR OLD.publication_status IS NULL) THEN
    -- Update all related data_indicators of that dataset to PUBLISHED
    UPDATE public.data_indicators
    SET status = 'PUBLISHED'
    WHERE resource_id IN (
      SELECT id FROM public.catalog_resources WHERE dataset_id = NEW.id
    ) AND status = 'DRAFT';

    -- Update all related data_points of that dataset to PUBLISHED
    UPDATE public.data_points
    SET status = 'PUBLISHED'
    WHERE resource_id IN (
      SELECT id FROM public.catalog_resources WHERE dataset_id = NEW.id
    ) AND status = 'DRAFT';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_catalog_metadata_publish_transition
AFTER UPDATE ON public.catalog_metadata
FOR EACH ROW EXECUTE FUNCTION public.handle_dataset_publication_status_change();

-- RLS Policy updates
DROP POLICY IF EXISTS "Dataset update policy" ON public.catalog_metadata;
CREATE POLICY "Dataset update policy"
ON public.catalog_metadata
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR (
      has_role('PRODUSEN')
      AND publisher_org_id = auth_org_id()
      AND publication_status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR (
      has_role('PRODUSEN')
      AND publisher_org_id = auth_org_id()
      AND publication_status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED')
    )
  )
);

DROP POLICY IF EXISTS "Data points viewing policy" ON public.data_points;
CREATE POLICY "Data points viewing policy"
ON public.data_points
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_points.resource_id
    AND (
      (m.classification_code = 'PUBLIC' AND m.publication_status = 'PUBLISHED' AND data_points.status = 'PUBLISHED')
      OR (
        auth.uid() IS NOT NULL
        AND (
          has_role('ADMIN')
          OR has_role('WALIDATA')
          OR has_role('KOORDINATOR')
          OR m.publisher_org_id = auth_org_id()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Indicator viewing policy" ON public.data_indicators;
CREATE POLICY "Indicator viewing policy"
ON public.data_indicators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_indicators.resource_id
    AND (
      (m.classification_code = 'PUBLIC' AND m.publication_status = 'PUBLISHED' AND data_indicators.status = 'PUBLISHED')
      OR (
        auth.uid() IS NOT NULL
        AND (
          has_role('ADMIN')
          OR has_role('WALIDATA')
          OR has_role('KOORDINATOR')
          OR m.publisher_org_id = auth_org_id()
        )
      )
    )
  )
);
