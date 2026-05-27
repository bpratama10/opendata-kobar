-- Migration to add organization category column and index
ALTER TABLE public.org_organizations 
ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Perangkat Daerah';

-- Index for performance optimization on filtering/grouping
CREATE INDEX idx_org_organizations_category ON public.org_organizations(category);
