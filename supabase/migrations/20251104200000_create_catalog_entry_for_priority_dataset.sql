CREATE OR REPLACE FUNCTION public.create_catalog_entry_for_priority_dataset()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the dataset has been assigned or claimed
    IF NEW.assigned_org IS NOT NULL AND OLD.assigned_org IS NULL THEN
        -- Insert a new entry into catalog_metadata
        INSERT INTO public.catalog_metadata (
            org_id,
            name,
            description,
            is_priority,
            priority_dataset_id,
            data_type,
            update_frequency,
            -- Add other relevant fields from priority_datasets that exist in catalog_metadata
            created_by,
            updated_by
        )
        VALUES (
            NEW.assigned_org,
            NEW.name,
            NEW.operational_definition,
            TRUE,
            NEW.id,
            NEW.data_type,
            NEW.update_schedule,
            -- Assuming the actor is the one who assigned or claimed
            COALESCE(NEW.assigned_by, NEW.claimed_by),
            COALESCE(NEW.assigned_by, NEW.claimed_by)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_priority_dataset_assign_or_claim
AFTER UPDATE ON public.priority_datasets
FOR EACH ROW
EXECUTE FUNCTION public.create_catalog_entry_for_priority_dataset();
