CREATE OR REPLACE FUNCTION public.fn_convert_priority_to_dataset(
  p_priority_dataset_id UUID,
  p_assignee_org_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  priority_rec RECORD;
  new_dataset_id UUID;
  new_slug TEXT;
BEGIN
  -- 1. Fetch the priority dataset record
  SELECT * INTO priority_rec
  FROM public.priority_datasets
  WHERE id = p_priority_dataset_id;

  -- 2. Generate a unique slug
  new_slug := public.slugify(priority_rec.dataset_name);
  IF EXISTS (SELECT 1 FROM public.catalog_metadata WHERE slug = new_slug) THEN
    new_slug := new_slug || '-' || to_char(now(), 'YYYYMMDDHH24MISS');
  END IF;

  -- 3. Insert into catalog_metadata
  INSERT INTO public.catalog_metadata (
    org_id,
    title,
    slug,
    abstract,
    description,
    source_name,
    update_frequency_code,
    is_priority,
    priority_dataset_id,
    created_by,
    updated_by
  )
  VALUES (
    p_assignee_org_id,
    priority_rec.dataset_name,
    new_slug,
    priority_rec.operational_definition,
    priority_rec.urgency_narrative,
    priority_rec.data_source,
    priority_rec.update_schedule,
    TRUE,
    p_priority_dataset_id,
    p_user_id,
    p_user_id
  ) RETURNING id INTO new_dataset_id;

  -- 4. Log the conversion event
  INSERT INTO public.priority_dataset_logs (
    priority_dataset_id,
    actor_id,
    action,
    details
  )
  VALUES (
    p_priority_dataset_id,
    p_user_id,
    'CONVERTED_TO_DATASET',
    jsonb_build_object('new_dataset_id', new_dataset_id, 'assigned_to_org', p_assignee_org_id)
  );

  RETURN new_dataset_id;
END;
$$ LANGUAGE plpgsql;
