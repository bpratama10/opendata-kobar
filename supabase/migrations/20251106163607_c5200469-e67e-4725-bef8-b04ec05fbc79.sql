-- Create API keys table for rate limiting
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own API keys
CREATE POLICY "Users can view own API keys"
ON public.api_keys FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can manage all API keys
CREATE POLICY "Admins can manage all API keys"
ON public.api_keys FOR ALL
USING (public.has_admin_or_walidata_role());

-- Update RLS for catalog_metadata to block direct anonymous access
-- Drop the existing public access policy
DROP POLICY IF EXISTS "Dataset viewing policy" ON public.catalog_metadata;

-- Replace with service_role or authenticated only
CREATE POLICY "Dataset viewing policy"
ON public.catalog_metadata FOR SELECT
USING (
  -- Service role can access public published datasets (for edge function gateway)
  (auth.jwt()->>'role' = 'service_role' AND classification_code = 'PUBLIC' AND publication_status = 'PUBLISHED')
  OR
  -- Authenticated users can access based on existing logic
  (
    (publication_status = 'PUBLISHED' AND classification_code = 'PUBLIC')
    OR (
      auth.uid() IS NOT NULL 
      AND (
        has_role('ADMIN') 
        OR has_role('WALIDATA') 
        OR has_role('KOORDINATOR') 
        OR publisher_org_id = auth_org_id()
      )
    )
  )
);