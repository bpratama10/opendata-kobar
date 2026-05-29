-- Migration to allow anonymous (unauthenticated) users to view organizations
-- This fixes the bug where organization names are hidden from public visitors on the dataset details page
CREATE POLICY "Anyone can view organizations" 
ON public.org_organizations 
FOR SELECT 
USING (true);
