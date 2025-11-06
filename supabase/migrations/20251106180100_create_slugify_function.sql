CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE OR REPLACE FUNCTION public.slugify(
  v_text TEXT
) RETURNS TEXT AS $$
  -- 1. Remove accents
  -- 2. Lowercase the string
  -- 3. Replace non-alphanumeric characters with a hyphen
  -- 4. Trim leading and trailing hyphens
  SELECT trim(both '-' FROM regexp_replace(lower(unaccent(v_text)), '[^a-z0-9]+', '-', 'g'));
$$ LANGUAGE sql IMMUTABLE;
