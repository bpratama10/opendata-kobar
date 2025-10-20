
-- =====================================================
-- UPDATE RLS POLICIES FOR ALL TABLES
-- =====================================================

-- =====================================================
-- Part 1: Fix catalog_metadata policies
-- =====================================================

DROP POLICY IF EXISTS "Role-based dataset viewing" ON public.catalog_metadata;
DROP POLICY IF EXISTS "Role-based dataset updates" ON public.catalog_metadata;
DROP POLICY IF EXISTS "Role-based dataset deletion" ON public.catalog_metadata;
DROP POLICY IF EXISTS "PRODUSEN can create datasets" ON public.catalog_metadata;
DROP POLICY IF EXISTS "WALIDATA can create datasets" ON public.catalog_metadata;
DROP POLICY IF EXISTS "Public datasets are viewable by everyone" ON public.catalog_metadata;
DROP POLICY IF EXISTS "Admin and Walidata can create datasets" ON public.catalog_metadata;

-- SELECT: Public OR authenticated users
CREATE POLICY "Dataset viewing policy"
ON public.catalog_metadata
FOR SELECT
USING (
  (publication_status = 'PUBLISHED' AND classification_code = 'PUBLIC')
  OR
  (auth.uid() IS NOT NULL AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR has_role('KOORDINATOR')
    OR publisher_org_id = auth_org_id()
  ))
);

-- INSERT: Admin/Walidata can create for any org, Produsen only for their org
CREATE POLICY "Dataset creation policy"
ON public.catalog_metadata
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR (has_role('PRODUSEN') AND publisher_org_id = auth_org_id())
  )
);

-- UPDATE: Admin/Walidata can update any, Produsen only their org's draft/pending
CREATE POLICY "Dataset update policy"
ON public.catalog_metadata
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR (
      has_role('PRODUSEN')
      AND publisher_org_id = auth_org_id()
      AND publication_status IN ('DRAFT', 'PENDING_REVIEW')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR (
      has_role('PRODUSEN')
      AND publisher_org_id = auth_org_id()
      AND publication_status IN ('DRAFT', 'PENDING_REVIEW')
    )
  )
);

-- DELETE: Admin/Walidata can delete any, Produsen only their org's draft/pending
CREATE POLICY "Dataset deletion policy"
ON public.catalog_metadata
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR (
      has_role('PRODUSEN')
      AND publisher_org_id = auth_org_id()
      AND publication_status IN ('DRAFT', 'PENDING_REVIEW')
    )
  )
);

-- =====================================================
-- Part 2: Fix catalog_resources policies
-- =====================================================

DROP POLICY IF EXISTS "Role-based resource management" ON public.catalog_resources;
DROP POLICY IF EXISTS "Role-based resource viewing" ON public.catalog_resources;
DROP POLICY IF EXISTS "Authenticated users can view all resources" ON public.catalog_resources;
DROP POLICY IF EXISTS "Public resources are viewable by everyone" ON public.catalog_resources;

CREATE POLICY "Resource viewing policy"
ON public.catalog_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catalog_metadata m
    WHERE m.id = catalog_resources.dataset_id
    AND (
      (m.classification_code = 'PUBLIC' AND m.publication_status = 'PUBLISHED')
      OR (
        auth.uid() IS NOT NULL
        AND (
          has_role('ADMIN')
          OR has_role('WALIDATA')
          OR has_role('KOORDINATOR')
          OR m.publisher_org_id = auth_org_id()
        )
      )
    )
  )
);

CREATE POLICY "Resource management policy"
ON public.catalog_resources
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM catalog_metadata m
    WHERE m.id = catalog_resources.dataset_id
    AND (
      has_role('ADMIN')
      OR has_role('WALIDATA')
      OR (
        has_role('PRODUSEN')
        AND m.publisher_org_id = auth_org_id()
        AND m.publication_status IN ('DRAFT', 'PENDING_REVIEW')
      )
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM catalog_metadata m
    WHERE m.id = catalog_resources.dataset_id
    AND (
      has_role('ADMIN')
      OR has_role('WALIDATA')
      OR (
        has_role('PRODUSEN')
        AND m.publisher_org_id = auth_org_id()
        AND m.publication_status IN ('DRAFT', 'PENDING_REVIEW')
      )
    )
  )
);
