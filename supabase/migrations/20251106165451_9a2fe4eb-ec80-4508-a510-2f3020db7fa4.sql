-- Fix fn_convert_priority_to_dataset to use correct column names
CREATE OR REPLACE FUNCTION public.fn_convert_priority_to_dataset(
  p_priority_dataset_id uuid, 
  p_assignee_org_id uuid, 
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  priority_rec RECORD;
  new_dataset_id UUID;
  new_slug TEXT;
BEGIN
  -- 1. Fetch the priority dataset record
  SELECT * INTO priority_rec
  FROM public.priority_datasets
  WHERE id = p_priority_dataset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Priority dataset not found: %', p_priority_dataset_id;
  END IF;

  -- 2. Generate a unique slug from the name field
  new_slug := public.slugify(priority_rec.name);
  IF EXISTS (SELECT 1 FROM public.catalog_metadata WHERE slug = new_slug) THEN
    new_slug := new_slug || '-' || to_char(now(), 'YYYYMMDDHH24MISS');
  END IF;

  -- 3. Insert into catalog_metadata with correct field mappings
  INSERT INTO public.catalog_metadata (
    publisher_org_id,
    title,
    slug,
    abstract,
    description,
    source_name,
    update_frequency_code,
    is_priority,
    priority_dataset_id,
    created_by,
    updated_by,
    publication_status
  )
  VALUES (
    p_assignee_org_id,
    priority_rec.name,                      -- Use 'name' not 'dataset_name'
    new_slug,
    priority_rec.operational_definition,     -- Use as abstract
    COALESCE(priority_rec.operational_definition, ''),  -- Use as description
    priority_rec.producing_agency,           -- Use producing agency as source
    priority_rec.update_schedule,
    TRUE,
    p_priority_dataset_id,
    p_user_id,
    p_user_id,
    'DRAFT'                                  -- Start as DRAFT
  ) RETURNING id INTO new_dataset_id;

  -- 4. Log the conversion event
  INSERT INTO public.priority_dataset_logs (
    priority_dataset_id,
    actor_id,
    action,
    notes
  )
  VALUES (
    p_priority_dataset_id,
    p_user_id,
    'CONVERTED_TO_DATASET',
    'Converted to dataset ID: ' || new_dataset_id::text || ', assigned to org: ' || p_assignee_org_id::text
  );

  RETURN new_dataset_id;
END;
$function$;