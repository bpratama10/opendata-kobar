-- Create helper functions for role-based access control

-- Function to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_role_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.org_user_roles ur
    JOIN public.org_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.code = _role_code
  )
$$;

-- Function to get current user's organization ID
CREATE OR REPLACE FUNCTION public.auth_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.org_users WHERE id = auth.uid();
$$;

-- Function to check if user can modify user roles (WALIDATA restriction)
CREATE OR REPLACE FUNCTION public.can_modify_user_role(_target_role_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Admins can modify any role
      WHEN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
      ) THEN true
      -- WALIDATA can only modify VIEWER and PRODUSEN roles
      WHEN has_role('WALIDATA') THEN _target_role_code IN ('VIEWER', 'PRODUSEN')
      ELSE false
    END
$$;

-- Update RLS policies for catalog_metadata (dataset management)
DROP POLICY IF EXISTS "Organization-based dataset viewing" ON public.catalog_metadata;
DROP POLICY IF EXISTS "Users can create datasets for their organization" ON public.catalog_metadata;
DROP POLICY IF EXISTS "Users can update their organization datasets" ON public.catalog_metadata;
DROP POLICY IF EXISTS "Users can delete their organization datasets" ON public.catalog_metadata;

-- WALIDATA and KOORDINATOR can view across organizations
CREATE POLICY "Role-based dataset viewing" 
ON public.catalog_metadata 
FOR SELECT 
USING (
  -- Public datasets for everyone
  (publication_status = 'PUBLISHED' AND classification_code = 'PUBLIC')
  OR
  -- Authenticated users can see their org's datasets
  (auth.uid() IS NOT NULL AND publisher_org_id = auth_org_id())
  OR
  -- WALIDATA and KOORDINATOR can see across orgs
  has_role('WALIDATA') OR has_role('KOORDINATOR')
  OR
  -- Admins can see everything
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PRODUSEN can create datasets for their org
CREATE POLICY "PRODUSEN can create datasets" 
ON public.catalog_metadata 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role('PRODUSEN')
  AND publisher_org_id = auth_org_id()
);

-- WALIDATA can create datasets for any org (review workflow)
CREATE POLICY "WALIDATA can create datasets" 
ON public.catalog_metadata 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (has_role('WALIDATA') OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- Update permissions: PRODUSEN for own org (DRAFT/PENDING_REVIEW only), WALIDATA for any org
CREATE POLICY "Role-based dataset updates" 
ON public.catalog_metadata 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- PRODUSEN can update their org's datasets in DRAFT/PENDING_REVIEW
    (has_role('PRODUSEN') AND publisher_org_id = auth_org_id() AND publication_status IN ('DRAFT', 'PENDING_REVIEW'))
    OR
    -- WALIDATA can update any dataset
    has_role('WALIDATA')
    OR
    -- Admins can update everything
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Delete permissions
CREATE POLICY "Role-based dataset deletion" 
ON public.catalog_metadata 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- PRODUSEN can delete their org's datasets in DRAFT/PENDING_REVIEW
    (has_role('PRODUSEN') AND publisher_org_id = auth_org_id() AND publication_status IN ('DRAFT', 'PENDING_REVIEW'))
    OR
    -- WALIDATA can delete any dataset
    has_role('WALIDATA')
    OR
    -- Admins can delete everything
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Update RLS policies for catalog_resources
DROP POLICY IF EXISTS "Authenticated users can manage resources" ON public.catalog_resources;

CREATE POLICY "Role-based resource viewing" 
ON public.catalog_resources 
FOR SELECT 
USING (
  -- Public resources for everyone
  EXISTS (
    SELECT 1 FROM catalog_metadata 
    WHERE id = catalog_resources.dataset_id 
      AND classification_code = 'PUBLIC' 
      AND publication_status = 'PUBLISHED'
  )
  OR
  -- Authenticated users can see their org's resources
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM catalog_metadata 
    WHERE id = catalog_resources.dataset_id 
      AND publisher_org_id = auth_org_id()
  ))
  OR
  -- WALIDATA and KOORDINATOR can see across orgs
  has_role('WALIDATA') OR has_role('KOORDINATOR')
  OR
  -- Admins can see everything
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Role-based resource management" 
ON public.catalog_resources 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- PRODUSEN can manage their org's resources
    (has_role('PRODUSEN') AND EXISTS (
      SELECT 1 FROM catalog_metadata 
      WHERE id = catalog_resources.dataset_id 
        AND publisher_org_id = auth_org_id()
        AND publication_status IN ('DRAFT', 'PENDING_REVIEW')
    ))
    OR
    -- WALIDATA can manage any resource
    has_role('WALIDATA')
    OR
    -- Admins can manage everything
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Update RLS for data_indicators
DROP POLICY IF EXISTS "Authenticated users can manage indicators" ON public.data_indicators;

CREATE POLICY "Role-based indicator viewing" 
ON public.data_indicators 
FOR SELECT 
USING (
  -- Public indicators
  EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_indicators.resource_id 
      AND m.classification_code = 'PUBLIC' 
      AND m.publication_status = 'PUBLISHED'
  )
  OR
  -- Users can see their org's indicators
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_indicators.resource_id 
      AND m.publisher_org_id = auth_org_id()
  ))
  OR
  -- WALIDATA and KOORDINATOR can see across orgs
  has_role('WALIDATA') OR has_role('KOORDINATOR')
  OR
  -- Admins can see everything
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Role-based indicator management" 
ON public.data_indicators 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- PRODUSEN can manage their org's indicators
    (has_role('PRODUSEN') AND EXISTS (
      SELECT 1 FROM catalog_resources r
      JOIN catalog_metadata m ON r.dataset_id = m.id
      WHERE r.id = data_indicators.resource_id 
        AND m.publisher_org_id = auth_org_id()
        AND m.publication_status IN ('DRAFT', 'PENDING_REVIEW')
    ))
    OR
    -- WALIDATA can manage any indicator
    has_role('WALIDATA')
    OR
    -- Admins can manage everything
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Update RLS for data_points
DROP POLICY IF EXISTS "Authenticated users can manage data points" ON public.data_points;

CREATE POLICY "Role-based data points viewing" 
ON public.data_points 
FOR SELECT 
USING (
  -- Public data points
  EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_points.resource_id 
      AND m.classification_code = 'PUBLIC' 
      AND m.publication_status = 'PUBLISHED'
  )
  OR
  -- Users can see their org's data points
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_points.resource_id 
      AND m.publisher_org_id = auth_org_id()
  ))
  OR
  -- WALIDATA and KOORDINATOR can see across orgs
  has_role('WALIDATA') OR has_role('KOORDINATOR')
  OR
  -- Admins can see everything
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Role-based data points management" 
ON public.data_points 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- PRODUSEN can manage their org's data points
    (has_role('PRODUSEN') AND EXISTS (
      SELECT 1 FROM catalog_resources r
      JOIN catalog_metadata m ON r.dataset_id = m.id
      WHERE r.id = data_points.resource_id 
        AND m.publisher_org_id = auth_org_id()
        AND m.publication_status IN ('DRAFT', 'PENDING_REVIEW')
    ))
    OR
    -- WALIDATA can manage any data point
    has_role('WALIDATA')
    OR
    -- Admins can manage everything
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Update org_user_roles policies for WALIDATA restrictions
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.org_user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.org_user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.org_user_roles;

CREATE POLICY "Role-based user role management" 
ON public.org_user_roles 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins can manage any role
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- WALIDATA can only modify VIEWER and PRODUSEN roles
    (has_role('WALIDATA') AND EXISTS (
      SELECT 1 FROM public.org_roles 
      WHERE id = org_user_roles.role_id 
        AND code IN ('VIEWER', 'PRODUSEN')
    ))
  )
);