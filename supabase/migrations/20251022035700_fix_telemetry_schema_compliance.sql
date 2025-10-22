-- Fix telemetry tables to comply with schema documentation
-- Changes: user_id references from org_users to auth.users, enum values for download_channel

-- ========================================
-- 1. Update download_channel enum to match schema safely
-- ========================================

-- Use DO blocks with exception handling for enum value renames
DO $$
BEGIN
    -- Rename 'portal' to 'WEB' if it exists
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'download_channel' AND e.enumlabel = 'portal'
    ) THEN
        ALTER TYPE public.download_channel RENAME VALUE 'portal' TO 'WEB';
    END IF;

    -- Rename 'api' to 'API' if it exists
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'download_channel' AND e.enumlabel = 'api'
    ) THEN
        ALTER TYPE public.download_channel RENAME VALUE 'api' TO 'API';
    END IF;

    -- Rename 'internal' to 'DIRECT' if it exists
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'download_channel' AND e.enumlabel = 'internal'
    ) THEN
        ALTER TYPE public.download_channel RENAME VALUE 'internal' TO 'DIRECT';
    END IF;
END $$;

-- ========================================
-- 2. Fix foreign key references for telemetry tables safely
-- ========================================

-- Drop existing foreign key constraints safely
DO $$
BEGIN
    -- Check and drop constraints if they exist
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'telemetry_views_user_id_fkey'
        AND conrelid = 'telemetry_views'::regclass
    ) THEN
        ALTER TABLE public.telemetry_views DROP CONSTRAINT telemetry_views_user_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'telemetry_downloads_user_id_fkey'
        AND conrelid = 'telemetry_downloads'::regclass
    ) THEN
        ALTER TABLE public.telemetry_downloads DROP CONSTRAINT telemetry_downloads_user_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'telemetry_audit_events_actor_id_fkey'
        AND conrelid = 'telemetry_audit_events'::regclass
    ) THEN
        ALTER TABLE public.telemetry_audit_events DROP CONSTRAINT telemetry_audit_events_actor_id_fkey;
    END IF;
END $$;

-- Add new foreign key constraints that reference auth.users
ALTER TABLE public.telemetry_views ADD CONSTRAINT telemetry_views_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.telemetry_downloads ADD CONSTRAINT telemetry_downloads_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.telemetry_audit_events ADD CONSTRAINT telemetry_audit_events_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ========================================
-- 3. Update RLS policies if needed (they should already be correct)
-- ========================================

-- Note: RLS policies were already using auth.uid() correctly, so no changes needed

COMMENT ON TABLE public.telemetry_views IS 'Tracks dataset page views with schema-compliant user references';
COMMENT ON TABLE public.telemetry_downloads IS 'Tracks file downloads with schema-compliant user references';
COMMENT ON TABLE public.telemetry_audit_events IS 'Audit trail with schema-compliant user references';
