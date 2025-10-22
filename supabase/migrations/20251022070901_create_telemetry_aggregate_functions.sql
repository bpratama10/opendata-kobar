-- Create functions to aggregate telemetry data for performance

-- Function to get download count for a dataset
CREATE OR REPLACE FUNCTION get_dataset_download_count(dataset_id_param UUID)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM telemetry_downloads td
  JOIN catalog_distributions cd ON td.distribution_id = cd.id
  JOIN catalog_resources cr ON cd.resource_id = cr.id
  WHERE cr.dataset_id = dataset_id_param;
$$;

-- Function to get view count for a dataset
CREATE OR REPLACE FUNCTION get_dataset_view_count(dataset_id_param UUID)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM telemetry_views
  WHERE dataset_id = dataset_id_param;
$$;

-- Function to get multiple dataset download counts at once
CREATE OR REPLACE FUNCTION get_datasets_download_counts(dataset_ids UUID[])
RETURNS TABLE(dataset_id UUID, download_count BIGINT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cm.id as dataset_id,
    COALESCE(COUNT(td.id), 0) as download_count
  FROM catalog_metadata cm
  LEFT JOIN catalog_resources cr ON cm.id = cr.dataset_id
  LEFT JOIN catalog_distributions cd ON cr.id = cd.resource_id
  LEFT JOIN telemetry_downloads td ON cd.id = td.distribution_id
  WHERE cm.id = ANY(dataset_ids)
  GROUP BY cm.id;
$$;

-- Function to get multiple dataset view counts at once
CREATE OR REPLACE FUNCTION get_datasets_view_counts(dataset_ids UUID[])
RETURNS TABLE(dataset_id UUID, view_count BIGINT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cm.id as dataset_id,
    COALESCE(COUNT(tv.id), 0) as view_count
  FROM catalog_metadata cm
  LEFT JOIN telemetry_views tv ON cm.id = tv.dataset_id
  WHERE cm.id = ANY(dataset_ids)
  GROUP BY cm.id;
$$;
