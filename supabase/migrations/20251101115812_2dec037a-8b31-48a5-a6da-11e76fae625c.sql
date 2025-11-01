-- Add unpublish_request_reason column to catalog_metadata
ALTER TABLE public.catalog_metadata
ADD COLUMN IF NOT EXISTS unpublish_request_reason text;

COMMENT ON COLUMN public.catalog_metadata.unpublish_request_reason IS 'Reason provided by PRODUSEN when requesting to unpublish a dataset';