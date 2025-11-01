-- Allow PRODUSEN to update unpublish_request_reason on their published datasets
CREATE POLICY "PRODUSEN can request unpublish on their published datasets"
ON public.catalog_metadata
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL) 
  AND has_role('PRODUSEN'::text) 
  AND (publisher_org_id = auth_org_id()) 
  AND (publication_status = 'PUBLISHED'::publication_status)
)
WITH CHECK (
  (auth.uid() IS NOT NULL) 
  AND has_role('PRODUSEN'::text) 
  AND (publisher_org_id = auth_org_id()) 
  AND (publication_status = 'PUBLISHED'::publication_status)
  -- Ensure only unpublish_request_reason and updated_at are being modified
  AND (
    unpublish_request_reason IS NOT NULL 
    OR unpublish_request_reason IS DISTINCT FROM (SELECT unpublish_request_reason FROM catalog_metadata WHERE id = catalog_metadata.id)
  )
);