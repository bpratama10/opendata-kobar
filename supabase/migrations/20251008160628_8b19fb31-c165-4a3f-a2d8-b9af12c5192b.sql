
-- =====================================================
-- Part 3: Fix data_indicators policies
-- =====================================================

DROP POLICY IF EXISTS "Role-based indicator management" ON public.data_indicators;
DROP POLICY IF EXISTS "Role-based indicator viewing" ON public.data_indicators;
DROP POLICY IF EXISTS "Public indicators are viewable by everyone" ON public.data_indicators;

CREATE POLICY "Indicator viewing policy"
ON public.data_indicators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_indicators.resource_id
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

CREATE POLICY "Indicator management policy"
ON public.data_indicators
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_indicators.resource_id
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
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_indicators.resource_id
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

-- =====================================================
-- Part 4: Fix data_points policies
-- =====================================================

DROP POLICY IF EXISTS "Role-based data points management" ON public.data_points;
DROP POLICY IF EXISTS "Role-based data points viewing" ON public.data_points;
DROP POLICY IF EXISTS "Public data points are viewable by everyone" ON public.data_points;

CREATE POLICY "Data points viewing policy"
ON public.data_points
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_points.resource_id
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

CREATE POLICY "Data points management policy"
ON public.data_points
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_points.resource_id
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
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_points.resource_id
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

-- =====================================================
-- Part 5: Fix catalog_distributions policies
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage distributions" ON public.catalog_distributions;
DROP POLICY IF EXISTS "Authenticated users can view all distributions" ON public.catalog_distributions;
DROP POLICY IF EXISTS "Public distributions are viewable by everyone" ON public.catalog_distributions;
DROP POLICY IF EXISTS "Role-based distribution management" ON public.catalog_distributions;

CREATE POLICY "Distribution viewing policy"
ON public.catalog_distributions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = catalog_distributions.resource_id
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

CREATE POLICY "Distribution management policy"
ON public.catalog_distributions
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = catalog_distributions.resource_id
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
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = catalog_distributions.resource_id
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

-- =====================================================
-- Part 6: Fix data_table_view_columns policies
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage table view columns" ON public.data_table_view_columns;
DROP POLICY IF EXISTS "Public table view columns are viewable by everyone" ON public.data_table_view_columns;
DROP POLICY IF EXISTS "Role-based table view management" ON public.data_table_view_columns;

CREATE POLICY "Table view columns viewing policy"
ON public.data_table_view_columns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_table_view_columns.resource_id
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

CREATE POLICY "Table view columns management policy"
ON public.data_table_view_columns
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_table_view_columns.resource_id
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
    SELECT 1 FROM catalog_resources r
    JOIN catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = data_table_view_columns.resource_id
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
