-- Download cooldown enforcement for telemetry_downloads
-- Reflects schema rules documented in docs/schema.md

-- 1. Helper function to check duplicate downloads within 30 minutes
CREATE OR REPLACE FUNCTION public.can_log_download(
  p_distribution_id UUID,
  p_user_id UUID,
  p_session_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identity TEXT;
BEGIN
  -- Determine identity priority: user_id (when authenticated) else provided session_id
  IF p_user_id IS NOT NULL THEN
    v_identity := p_user_id::text;
  ELSE
    v_identity := COALESCE(p_session_id, '');
  END IF;

  -- Reject if we have neither user nor session
  IF v_identity = '' THEN
    RETURN FALSE;
  END IF;

  -- Check if a record exists within the last 30 minutes
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.telemetry_downloads td
    WHERE td.distribution_id = p_distribution_id
      AND COALESCE(td.user_id::text, td.session_id) = v_identity
      AND td.created_at >= now() - interval '30 minutes'
  );
END;
$$;

COMMENT ON FUNCTION public.can_log_download(UUID, UUID, TEXT) IS
  'Enforces a 30 minute cooldown per distribution per user/session;

   Returns true only if no download has been logged recently.';

-- 2. Adjust RLS to allow anonymous guests with cooldown enforcement
DROP POLICY IF EXISTS "Authenticated users can view downloads" ON public.telemetry_downloads;
DROP POLICY IF EXISTS "Users can log their downloads" ON public.telemetry_downloads;

-- Allow everyone to view aggregated download info
CREATE POLICY "Anyone can view download logs"
ON public.telemetry_downloads
FOR SELECT
USING (true);

-- Allow authenticated users to insert as long as cooldown passes
CREATE POLICY "Authenticated users can log downloads"
ON public.telemetry_downloads
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND can_log_download(
    distribution_id,
    auth.uid(),
    session_id
  )
);

-- Allow guests (no auth.uid) to insert with a session_id and cooldown guard
CREATE POLICY "Guests can log downloads with session cooldown"
ON public.telemetry_downloads
FOR INSERT
WITH CHECK (
  auth.uid() IS NULL
  AND session_id IS NOT NULL
  AND session_id <> ''
  AND can_log_download(
    distribution_id,
    NULL,
    session_id
  )
);
