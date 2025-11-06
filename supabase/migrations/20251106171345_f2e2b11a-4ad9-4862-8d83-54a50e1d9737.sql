-- Make the conversion function SECURITY DEFINER so it can insert logs
CREATE OR REPLACE FUNCTION public.fn_convert_priority_to_dataset(
  p_priority_dataset_id uuid, 
  p_assignee_org_id uuid, 
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  priority_rec RECORD;
  new_dataset_id UUID;
  new_slug TEXT;
BEGIN
  -- 1. Fetch the priority dataset
  SELECT * INTO priority_rec
  FROM priority_datasets
  WHERE id = p_priority_dataset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Priority dataset not found: %', p_priority_dataset_id;
  END IF;

  -- 2. Generate unique slug from name
  new_slug := slugify(priority_rec.name);
  IF EXISTS (SELECT 1 FROM catalog_metadata WHERE slug = new_slug) THEN
    new_slug := new_slug || '-' || to_char(now(), 'YYYYMMDDHH24MISS');
  END IF;

  -- 3. Create catalog_metadata - ONLY name to title, slug locked, rest editable
  INSERT INTO catalog_metadata (
    publisher_org_id,
    title,
    slug,
    is_priority,
    priority_dataset_id,
    created_by,
    updated_by,
    publication_status,
    classification_code
  )
  VALUES (
    p_assignee_org_id,
    priority_rec.name,
    new_slug,
    TRUE,
    p_priority_dataset_id,
    p_user_id,
    p_user_id,
    'DRAFT',
    'PUBLIC'
  ) RETURNING id INTO new_dataset_id;

  -- 4. Log the conversion
  INSERT INTO priority_dataset_logs (
    priority_dataset_id,
    actor_id,
    action,
    notes
  )
  VALUES (
    p_priority_dataset_id,
    p_user_id,
    'converted',
    'Converted to dataset ID: ' || new_dataset_id::text
  );

  RETURN new_dataset_id;
END;
$function$;