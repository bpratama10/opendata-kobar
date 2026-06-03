-- Alter the custom_id column type to allow longer values (like dotted formats)
ALTER TABLE public.catalog_metadata ALTER COLUMN custom_id TYPE VARCHAR(50);

-- Update the generate_dataset_custom_id trigger function
CREATE OR REPLACE FUNCTION public.generate_dataset_custom_id()
RETURNS TRIGGER AS $$
DECLARE
  v_org_code VARCHAR(50);
  v_prefix VARCHAR(100);
  v_next_seq INT;
BEGIN
  -- Only execute if the dataset is transitioned to PUBLISHED and doesn't have an ID yet
  IF NEW.publication_status = 'PUBLISHED' AND NEW.custom_id IS NULL THEN
    
    -- Check if urusan_code is present
    IF NEW.urusan_code IS NOT NULL AND NEW.urusan_code <> '' THEN
      -- If urusan_code is chosen, build prefix based on urusan_code
      v_prefix := '6201.U' || NEW.urusan_code || '.';
    ELSE
      -- If urusan_code is not chosen, we require publisher_org_id to have a 2-digit org_code
      IF NEW.publisher_org_id IS NULL THEN
        RAISE EXCEPTION 'Organisasi penerbit belum dipilih dan Urusan belum ditentukan! Silakan pilih Urusan atau organisasi penerbit.';
      END IF;

      SELECT org_code INTO v_org_code 
      FROM public.org_organizations 
      WHERE id = NEW.publisher_org_id;

      IF v_org_code IS NULL OR v_org_code = '' THEN
        RAISE EXCEPTION 'Organisasi penerbit belum memiliki Kode Organisasi 2-digit (org_code)! Silakan konfigurasikan terlebih dahulu di panel Organisasi, atau pilih Urusan untuk dataset ini.';
      END IF;

      -- Format org_code to be 2 digits
      v_org_code := LPAD(v_org_code, 2, '0');
      v_prefix := '6201.C' || v_org_code || '.';
    END IF;

    -- Find the highest existing sequential number under this prefix format
    -- We extract the suffix sequence number using regex to handle varying prefix lengths (e.g. 6201.U2.11.0001 or 6201.C11.0001)
    SELECT COALESCE(MAX(NULLIF(substring(custom_id from '\.([^.]+)$'), '')::integer), 0)
    INTO v_next_seq
    FROM public.catalog_metadata
    WHERE custom_id LIKE v_prefix || '%';

    -- Increment the sequence
    v_next_seq := v_next_seq + 1;

    -- Limit safeguard
    IF v_next_seq > 9999 THEN
      RAISE EXCEPTION 'Sequence limit reached (9999) for prefix %', v_prefix;
    END IF;

    -- Combine: prefix + padded sequence
    NEW.custom_id := v_prefix || LPAD(v_next_seq::text, 4, '0');

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing published dataset's custom ID using the new trigger logic
UPDATE public.catalog_metadata
SET custom_id = NULL
WHERE id = 'e59e9821-4831-4208-a05f-cf0ffcfcb3b4';
