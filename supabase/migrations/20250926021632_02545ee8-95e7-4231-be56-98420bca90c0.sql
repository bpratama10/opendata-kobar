-- Update RLS policies for organization-based access control

-- Drop existing policies for catalog_metadata that conflict
DROP POLICY IF EXISTS "Authenticated users can create datasets" ON catalog_metadata;
DROP POLICY IF EXISTS "Authenticated users can update datasets" ON catalog_metadata;
DROP POLICY IF EXISTS "Authenticated users can delete datasets" ON catalog_metadata;
DROP POLICY IF EXISTS "Users can view their own organization datasets" ON catalog_metadata;

-- Create function to get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.org_users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if user has WALIDATA or ADMIN role
CREATE OR REPLACE FUNCTION public.has_admin_or_walidata_role()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.org_user_roles ur
    JOIN public.org_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.code IN ('ADMIN', 'WALIDATA')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create new organization-based RLS policies for catalog_metadata

-- Users can view datasets from their organization + public published datasets + admin/walidata can see all
CREATE POLICY "Organization-based dataset viewing" ON catalog_metadata
FOR SELECT USING (
  -- Public published datasets are viewable by everyone
  (classification_code = 'PUBLIC' AND is_published = true)
  OR
  -- Authenticated users can see their own org datasets
  (auth.uid() IS NOT NULL AND publisher_org_id = get_user_org_id())
  OR
  -- Admin/Walidata roles can see everything
  has_admin_or_walidata_role()
);

-- Users can only create datasets for their organization
CREATE POLICY "Users can create datasets for their organization" ON catalog_metadata
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    publisher_org_id = get_user_org_id()
    OR has_admin_or_walidata_role()
  )
);

-- Users can only update datasets from their organization (except admin/walidata)
CREATE POLICY "Users can update their organization datasets" ON catalog_metadata
FOR UPDATE USING (
  auth.uid() IS NOT NULL 
  AND (
    publisher_org_id = get_user_org_id()
    OR has_admin_or_walidata_role()
  )
);

-- Users can only delete datasets from their organization (except admin/walidata) 
CREATE POLICY "Users can delete their organization datasets" ON catalog_metadata
FOR DELETE USING (
  auth.uid() IS NOT NULL 
  AND (
    publisher_org_id = get_user_org_id()
    OR has_admin_or_walidata_role()
  )
);