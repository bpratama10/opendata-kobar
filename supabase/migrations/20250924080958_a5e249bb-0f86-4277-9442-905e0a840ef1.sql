-- ========================================
-- RLS Policies for Reference Tables (Public Read)
-- ========================================

-- Reference tables should be readable by everyone
CREATE POLICY "Anyone can read roles" ON public.org_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can read classifications" ON public.catalog_data_classifications FOR SELECT USING (true);
CREATE POLICY "Anyone can read licenses" ON public.lisensi FOR SELECT USING (true);
CREATE POLICY "Anyone can read frequencies" ON public.freq_upd FOR SELECT USING (true);
CREATE POLICY "Anyone can read tags" ON public.catalog_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can read themes" ON public.catalog_themes FOR SELECT USING (true);

-- ========================================
-- RLS Policies for Organization Tables
-- ========================================

-- Organizations can be viewed by authenticated users
CREATE POLICY "Authenticated users can view organizations" 
ON public.org_organizations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Only admins can modify organizations
CREATE POLICY "Admins can manage organizations" 
ON public.org_organizations 
FOR ALL 
USING (auth.uid() IS NOT NULL); -- Placeholder - will need proper admin check

-- ========================================
-- RLS Policies for User Tables
-- ========================================

-- Users can view their own data and users from their organization
CREATE POLICY "Users can view their own data" 
ON public.org_users 
FOR SELECT 
USING (auth.uid() IS NOT NULL); -- Simplified for now

-- Users can update their own data
CREATE POLICY "Users can update their own data" 
ON public.org_users 
FOR UPDATE 
USING (auth.uid() IS NOT NULL); -- Simplified for now

-- User roles can be viewed by authenticated users
CREATE POLICY "Authenticated users can view user roles" 
ON public.org_user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ========================================
-- RLS Policies for Catalog Tables
-- ========================================

-- Resources follow the same pattern as datasets
CREATE POLICY "Public resources are viewable by everyone" 
ON public.catalog_resources 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.catalog_metadata 
    WHERE id = dataset_id 
    AND classification_code = 'PUBLIC' 
    AND is_published = true
  )
);

CREATE POLICY "Authenticated users can view all resources" 
ON public.catalog_resources 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Distributions follow the same pattern
CREATE POLICY "Public distributions are viewable by everyone" 
ON public.catalog_distributions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.catalog_resources r
    JOIN public.catalog_metadata m ON r.dataset_id = m.id
    WHERE r.id = resource_id 
    AND m.classification_code = 'PUBLIC' 
    AND m.is_published = true
  )
);

CREATE POLICY "Authenticated users can view all distributions" 
ON public.catalog_distributions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Dataset tags can be viewed by everyone
CREATE POLICY "Anyone can view dataset tags" 
ON public.catalog_dataset_tags 
FOR SELECT 
USING (true);

-- Dataset themes can be viewed by everyone
CREATE POLICY "Anyone can view dataset themes" 
ON public.catalog_dataset_themes 
FOR SELECT 
USING (true);

-- ========================================
-- RLS Policies for Spatial Coverage
-- ========================================

-- Spatial units can be viewed by everyone (geographic reference data)
CREATE POLICY "Anyone can view spatial units" 
ON public.spatial_units 
FOR SELECT 
USING (true);

-- Spatial coverage can be viewed by everyone
CREATE POLICY "Anyone can view spatial coverage" 
ON public.catalog_dataset_spatial_coverage 
FOR SELECT 
USING (true);

-- ========================================
-- RLS Policies for Logging Tables
-- ========================================

-- Audit events should only be accessible to authenticated users
CREATE POLICY "Authenticated users can view audit events" 
ON public.telemetry_audit_events 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Downloads can be viewed by authenticated users
CREATE POLICY "Authenticated users can view downloads" 
ON public.telemetry_downloads 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Users can insert their own download records
CREATE POLICY "Users can log their downloads" 
ON public.telemetry_downloads 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================
-- RLS Policies for Dataset Policies
-- ========================================

-- Dataset policies should only be accessible to authenticated users
CREATE POLICY "Authenticated users can view dataset policies" 
ON public.gov_dataset_policies 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ========================================
-- Insert/Update/Delete Policies for Management Tables
-- ========================================

-- Allow authenticated users to insert tags (subject to validation)
CREATE POLICY "Authenticated users can create tags" 
ON public.catalog_tags 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to create themes
CREATE POLICY "Authenticated users can create themes" 
ON public.catalog_themes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to create/manage dataset relationships
CREATE POLICY "Authenticated users can manage dataset tags" 
ON public.catalog_dataset_tags 
FOR ALL 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage dataset themes" 
ON public.catalog_dataset_themes 
FOR ALL 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage spatial coverage" 
ON public.catalog_dataset_spatial_coverage 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create resources and distributions
CREATE POLICY "Authenticated users can manage resources" 
ON public.catalog_resources 
FOR ALL 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage distributions" 
ON public.catalog_distributions 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert audit events
CREATE POLICY "Users can create audit events" 
ON public.telemetry_audit_events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);