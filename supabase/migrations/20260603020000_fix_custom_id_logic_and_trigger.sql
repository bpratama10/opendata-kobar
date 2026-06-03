-- Update the generate_dataset_custom_id trigger function to correctly exclude the current row during updates
-- and handle prefix transitions robustly.
CREATE OR REPLACE FUNCTION public.generate_dataset_custom_id()
RETURNS TRIGGER AS $$
DECLARE
  v_org_code VARCHAR(50);
  v_prefix VARCHAR(100);
  v_next_seq INT;
BEGIN
  -- Only execute if the dataset is in PUBLISHED status
  IF NEW.publication_status = 'PUBLISHED' THEN
    
    -- Build the prefix based on urusan_code or organization's org_code
    IF NEW.urusan_code IS NOT NULL AND NEW.urusan_code <> '' THEN
      v_prefix := '6201.U' || NEW.urusan_code || '.';
    ELSE
      IF NEW.publisher_org_id IS NULL THEN
        RAISE EXCEPTION 'Organisasi penerbit belum dipilih dan Urusan belum ditentukan! Silakan pilih Urusan atau organisasi penerbit.';
      END IF;

      SELECT org_code INTO v_org_code 
      FROM public.org_organizations 
      WHERE id = NEW.publisher_org_id;

      IF v_org_code IS NULL OR v_org_code = '' THEN
        RAISE EXCEPTION 'Organisasi penerbit belum memiliki Kode Organisasi 2-digit (org_code)! Silakan konfigurasikan terlebih dahulu di panel Organisasi, atau pilih Urusan untuk dataset ini.';
      END IF;

      v_org_code := LPAD(v_org_code, 2, '0');
      v_prefix := '6201.C' || v_org_code || '.';
    END IF;

    -- Regenerate custom_id if it is NULL or does not start with the expected prefix (e.g. if urusan or org changed)
    IF NEW.custom_id IS NULL OR NEW.custom_id NOT LIKE v_prefix || '%' THEN
      -- Find the highest existing sequential number under this prefix format
      -- We exclude the current row (in case of updates) to avoid finding our own old custom_id
      SELECT COALESCE(MAX(NULLIF(substring(custom_id from '\.([^.]+)$'), '')::integer), 0)
      INTO v_next_seq
      FROM public.catalog_metadata
      WHERE custom_id LIKE v_prefix || '%'
        AND id <> NEW.id;

      v_next_seq := v_next_seq + 1;

      IF v_next_seq > 9999 THEN
        RAISE EXCEPTION 'Sequence limit reached (9999) for prefix %', v_prefix;
      END IF;

      NEW.custom_id := v_prefix || LPAD(v_next_seq::text, 4, '0');
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is bound to catalog_metadata BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS trg_generate_dataset_custom_id ON public.catalog_metadata;

CREATE TRIGGER trg_generate_dataset_custom_id
BEFORE INSERT OR UPDATE ON public.catalog_metadata
FOR EACH ROW
EXECUTE FUNCTION public.generate_dataset_custom_id();

-- Reset and regenerate the custom ID of the published dataset that got incorrect sequence due to the old trigger bug
UPDATE public.catalog_metadata
SET custom_id = NULL
WHERE id = 'e59e9821-4831-4208-a05f-cf0ffcfcb3b4';
