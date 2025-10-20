-- CRITICAL SECURITY FIX: Address privilege escalation vulnerabilities
-- This migration fixes 3 error-level security findings

-- ============================================================
-- STEP 1: Drop policies that depend on profiles.role
-- ============================================================
DROP POLICY IF EXISTS "Role-based user role management" ON public.org_user_roles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- ============================================================
-- STEP 2: Remove profiles.role column (dual role system vulnerability)
-- ============================================================
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- ============================================================
-- STEP 3: Remove password_hash from org_users (unnecessary and dangerous)
-- ============================================================
ALTER TABLE public.org_users DROP COLUMN IF EXISTS password_hash;

-- ============================================================
-- STEP 4: Update security functions to use ONLY org_user_roles
-- ============================================================

-- Drop the profile-based admin check function (no longer needed)
DROP FUNCTION IF EXISTS public.is_profile_admin();

-- Update has_role to ONLY check org_user_roles (remove profile.role fallback)
CREATE OR REPLACE FUNCTION public.has_role(_role_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.org_user_roles ur
    JOIN public.org_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.code = _role_code
  )
$$;

-- Update is_admin to ONLY check org_user_roles
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_user_roles ur
    JOIN public.org_roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.code = 'ADMIN'
  )
$$;

-- ============================================================
-- STEP 5: Recreate org_user_roles policy using has_role()
-- ============================================================
CREATE POLICY "Role-based user role management" 
ON public.org_user_roles 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins can manage any role using has_role function
    has_role('ADMIN')
    OR
    -- WALIDATA can only modify VIEWER and PRODUSEN roles
    (
      has_role('WALIDATA') 
      AND EXISTS (
        SELECT 1 FROM public.org_roles 
        WHERE id = org_user_roles.role_id 
        AND code IN ('VIEWER', 'PRODUSEN')
      )
    )
  )
);

-- ============================================================
-- STEP 6: Update handle_new_user trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  viewer_role_id UUID;
BEGIN
  -- Create profile WITHOUT role column
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Create org_users record WITHOUT password_hash
  INSERT INTO public.org_users (id, email, full_name, org_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NULL,
    true
  );
  
  -- Assign default VIEWER role via org_user_roles ONLY
  SELECT id INTO viewer_role_id FROM public.org_roles WHERE code = 'VIEWER' LIMIT 1;
  
  IF viewer_role_id IS NOT NULL THEN
    INSERT INTO public.org_user_roles (user_id, role_id) 
    VALUES (NEW.id, viewer_role_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- STEP 7: Add safe update policy for profiles
-- ============================================================
CREATE POLICY "Users can update their own profile safely"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: Since role column is removed, users can only update full_name and email
-- which is safe. Admins still have their separate "Admins can update any profile" policy.