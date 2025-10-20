
-- =====================================================
-- FIX ADMIN USER DATA CONSISTENCY - Remove duplicates
-- =====================================================

-- Step 1: Create is_profile_admin helper function
CREATE OR REPLACE FUNCTION public.is_profile_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Step 2: Remove the old admin user entry (if it exists)
-- First, remove role assignments
DELETE FROM public.org_user_roles
WHERE user_id = '89d888a8-7adb-46c4-9e30-904c827e1156';

-- Then remove the org_users entry
DELETE FROM public.org_users
WHERE id = '89d888a8-7adb-46c4-9e30-904c827e1156';

-- Step 3: Create org_users entry for the current admin user
INSERT INTO public.org_users (id, email, full_name, org_id, is_active, created_at, updated_at)
VALUES (
  '3a08224e-5d70-4618-97bd-d9ae57e2f43e',
  'bpratama10@gmail.com',
  'Administrator',
  '7f3347dd-3299-408d-a456-ad87aa69e10c',
  true,
  now(),
  now()
);

-- Step 4: Add ADMIN role for the current user
INSERT INTO public.org_user_roles (user_id, role_id)
VALUES (
  '3a08224e-5d70-4618-97bd-d9ae57e2f43e',
  (SELECT id FROM public.org_roles WHERE code = 'ADMIN')
);

-- Step 5: Update has_role to check both org_user_roles AND profiles.role for ADMIN
CREATE OR REPLACE FUNCTION public.has_role(_role_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    -- Check if user has the role in org_user_roles
    EXISTS (
      SELECT 1 
      FROM public.org_user_roles ur
      JOIN public.org_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.code = _role_code
    )
    OR
    -- Special case: if checking for ADMIN role, also check profiles.role
    (_role_code = 'ADMIN' AND public.is_profile_admin())
  )
$$;
