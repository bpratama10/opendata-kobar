-- Function to update catalog_metadata.updated_at based on resource_id
CREATE OR REPLACE FUNCTION public.update_catalog_metadata_updated_at_from_resource()
RETURNS TRIGGER AS $$
DECLARE
  _dataset_id UUID;
BEGIN
  -- Determine the dataset_id from the resource_id
  SELECT dataset_id INTO _dataset_id
  FROM public.catalog_resources
  WHERE id = NEW.resource_id; -- For INSERT/UPDATE
  
  IF _dataset_id IS NULL AND TG_OP = 'DELETE' THEN
    SELECT dataset_id INTO _dataset_id
    FROM public.catalog_resources
    WHERE id = OLD.resource_id; -- For DELETE
  END IF;

  -- Update the updated_at column in catalog_metadata
  IF _dataset_id IS NOT NULL THEN
    UPDATE public.catalog_metadata
    SET updated_at = now()
    WHERE id = _dataset_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for data_indicators
CREATE TRIGGER trg_data_indicators_update_metadata
AFTER INSERT OR UPDATE OR DELETE ON public.data_indicators
FOR EACH ROW EXECUTE FUNCTION public.update_catalog_metadata_updated_at_from_resource();

-- Triggers for data_points
CREATE TRIGGER trg_data_points_update_metadata
AFTER INSERT OR UPDATE OR DELETE ON public.data_points
FOR EACH ROW EXECUTE FUNCTION public.update_catalog_metadata_updated_at_from_resource();

-- Triggers for data_table_view_columns
CREATE TRIGGER trg_data_table_view_columns_update_metadata
AFTER INSERT OR UPDATE OR DELETE ON public.data_table_view_columns
FOR EACH ROW EXECUTE FUNCTION public.update_catalog_metadata_updated_at_from_resource();
