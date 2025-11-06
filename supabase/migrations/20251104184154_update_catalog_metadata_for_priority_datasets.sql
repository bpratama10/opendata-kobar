ALTER TABLE catalog_metadata
ADD COLUMN is_priority BOOLEAN DEFAULT FALSE,
ADD COLUMN priority_dataset_id UUID REFERENCES priority_datasets(id);

-- Add RLS policy for catalog_metadata to allow viewing priority status
CREATE POLICY "Enable read access for all users on is_priority" ON catalog_metadata
  FOR SELECT USING (TRUE);
