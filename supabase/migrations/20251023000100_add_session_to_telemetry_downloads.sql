-- Add guest session support for telemetry downloads
-- Reflects schema naming conventions from docs/schema.md

-- 1. Add a nullable session identifier so anonymous visitors can be throttled per device/session
ALTER TABLE public.telemetry_downloads
ADD COLUMN session_id TEXT;

-- 2. Index the session column for faster duplicate checks
CREATE INDEX idx_telemetry_downloads_session_id
  ON public.telemetry_downloads(session_id);

-- 3. Ensure download timestamps always have a value (should already be set in earlier migrations, but add guard just in case)
ALTER TABLE public.telemetry_downloads
ALTER COLUMN created_at SET DEFAULT now();

COMMENT ON COLUMN public.telemetry_downloads.session_id IS
  'Guest session identifier used to enforce download cooldowns for anonymous users.';
