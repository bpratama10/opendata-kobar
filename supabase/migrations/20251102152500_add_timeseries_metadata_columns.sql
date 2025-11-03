-- Migration: Add time-series visualization metadata to catalog_resources
-- Purpose: Support standardized long-format indicator datasets and metadata-driven chart rendering

BEGIN;

ALTER TABLE public.catalog_resources
  ADD COLUMN IF NOT EXISTS indicator_title text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS frequency text,
  ADD COLUMN IF NOT EXISTS aggregation_method text,
  ADD COLUMN IF NOT EXISTS time_dimension text DEFAULT 'year',
  ADD COLUMN IF NOT EXISTS chart_type text,
  ADD COLUMN IF NOT EXISTS interpretation text,
  ADD COLUMN IF NOT EXISTS is_timeseries boolean DEFAULT false;

-- Optional: enforce valid chart type values when provided
ALTER TABLE public.catalog_resources
  ADD CONSTRAINT catalog_resources_chart_type_check
  CHECK (
    chart_type IS NULL
    OR chart_type IN ('line', 'area', 'slope', 'kpi', 'bar', 'table')
  );

COMMIT;
