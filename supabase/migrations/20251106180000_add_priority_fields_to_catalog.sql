ALTER TABLE public.catalog_metadata
ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS priority_dataset_id UUID,
ADD COLUMN IF NOT EXISTS sync_lock BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.catalog_metadata.is_priority IS 'Flag to indicate if the dataset originated from a priority dataset list.';
COMMENT ON COLUMN public.catalog_metadata.priority_dataset_id IS 'Foreign key to the original priority_datasets table.';
COMMENT ON COLUMN public.catalog_metadata.sync_lock IS 'When TRUE, prevents the dataset from being overwritten by updates from the priority list.';

-- Optional: Add a foreign key constraint if you want to enforce referential integrity
-- ALTER TABLE public.catalog_metadata
-- ADD CONSTRAINT fk_priority_dataset
-- FOREIGN KEY (priority_dataset_id) REFERENCES public.priority_datasets(id);
