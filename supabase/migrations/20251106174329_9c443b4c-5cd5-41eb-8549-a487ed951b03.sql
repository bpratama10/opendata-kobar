-- Allow ADMIN and KOORDINATOR to perform full resets on priority datasets
CREATE POLICY "Admins and Coordinators can reset priority datasets"
ON priority_datasets
FOR UPDATE
USING (
  has_role('ADMIN') OR has_role('KOORDINATOR')
)
WITH CHECK (
  has_role('ADMIN') OR has_role('KOORDINATOR')
);

-- Add 'reset' to priority_action enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'priority_action' AND e.enumlabel = 'reset'
  ) THEN
    ALTER TYPE priority_action ADD VALUE 'reset';
  END IF;
END $$;