-- Bridge existing users from profiles to org_users (with conflict handling)
-- This ensures all Supabase Auth users appear in UserManagement

-- First, insert existing profile users into org_users with org_id = NULL (handle conflicts)
INSERT INTO public.org_users (id, email, full_name, org_id, is_active, created_at, updated_at)
SELECT 
  p.id,
  p.email,
  COALESCE(p.full_name, 'Unknown User'),
  NULL, -- org_id = NULL initially, admin can assign later
  true,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.org_users ou WHERE ou.email = p.email OR ou.id = p.id
)
ON CONFLICT (email) DO NOTHING;

-- Ensure required roles exist
INSERT INTO public.org_roles (code, name) 
VALUES 
  ('VIEWER', 'Viewer'),
  ('ADMIN', 'Admin'),
  ('WALIDATA', 'Walidata')
ON CONFLICT (code) DO NOTHING;

-- Assign roles to users who don't have any roles yet
DO $$
DECLARE
  viewer_role_id UUID;
  admin_role_id UUID;
  current_user_record RECORD;
BEGIN
  -- Get role IDs
  SELECT id INTO viewer_role_id FROM public.org_roles WHERE code = 'VIEWER';
  SELECT id INTO admin_role_id FROM public.org_roles WHERE code = 'ADMIN';
  
  -- Assign roles to existing users based on their profile.role
  FOR current_user_record IN 
    SELECT p.id, p.role
    FROM public.profiles p
    JOIN public.org_users ou ON ou.id = p.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.org_user_roles ur WHERE ur.user_id = p.id
    )
  LOOP
    IF current_user_record.role = 'admin' THEN
      INSERT INTO public.org_user_roles (user_id, role_id) 
      VALUES (current_user_record.id, admin_role_id);
    ELSE
      INSERT INTO public.org_user_roles (user_id, role_id) 
      VALUES (current_user_record.id, viewer_role_id);
    END IF;
  END LOOP;
END $$;

-- Update the handle_new_user trigger to create records in BOTH profiles AND org_users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  viewer_role_id UUID;
BEGIN
  -- Create profile record (original behavior)
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.email = 'bpratama10@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  );
  
  -- Create org_users record with org_id = NULL (admin can assign later)
  INSERT INTO public.org_users (id, email, full_name, org_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NULL, -- org_id = NULL for self-signup users
    true
  );
  
  -- Assign default VIEWER role
  SELECT id INTO viewer_role_id FROM public.org_roles WHERE code = 'VIEWER' LIMIT 1;
  
  IF viewer_role_id IS NOT NULL THEN
    INSERT INTO public.org_user_roles (user_id, role_id) 
    VALUES (NEW.id, viewer_role_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;