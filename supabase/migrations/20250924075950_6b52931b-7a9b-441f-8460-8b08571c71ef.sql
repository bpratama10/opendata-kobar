-- Create ENUM types for classification and other codes
CREATE TYPE public.classification_type AS ENUM ('PUBLIC', 'TERBATAS');

-- Create catalog_metadata table
CREATE TABLE public.catalog_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Information
  org_id UUID, -- Will add FK constraint once org_organizations table exists
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(320) UNIQUE NOT NULL,
  abstract TEXT,
  description TEXT,
  last_updated_display TIMESTAMP WITH TIME ZONE,
  
  -- Publication Information  
  source_name VARCHAR(200),
  publisher_org_id UUID, -- Will add FK constraint once org_organizations table exists
  maintainers JSONB DEFAULT '[]'::jsonb,
  contact_email VARCHAR(255),
  
  -- Coverage/Access
  classification_code classification_type DEFAULT 'PUBLIC',
  language VARCHAR(10) DEFAULT 'id',
  license_code VARCHAR(40), -- Will add FK constraint once license table exists
  update_frequency_code VARCHAR(20), -- Will add FK constraint once freq_upd table exists
  temporal_start DATE,
  temporal_end DATE,
  is_published BOOLEAN DEFAULT false,
  
  -- Other fields
  keywords JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_by UUID, -- Will add FK constraint once org_users table exists
  updated_by UUID, -- Will add FK constraint once org_users table exists
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_catalog_metadata_org_id ON public.catalog_metadata(org_id);
CREATE INDEX idx_catalog_metadata_classification ON public.catalog_metadata(classification_code);
CREATE INDEX idx_catalog_metadata_published ON public.catalog_metadata(is_published);
CREATE INDEX idx_catalog_metadata_temporal ON public.catalog_metadata(temporal_start, temporal_end);
CREATE INDEX idx_catalog_metadata_created_at ON public.catalog_metadata(created_at);

-- Create full-text search index
CREATE INDEX idx_catalog_metadata_fulltext ON public.catalog_metadata 
USING GIN (to_tsvector('indonesian', coalesce(title, '') || ' ' || coalesce(abstract, '') || ' ' || coalesce(description, '')));

-- Enable Row Level Security
ALTER TABLE public.catalog_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic ones - you may want to adjust based on your needs)
CREATE POLICY "Public datasets are viewable by everyone" 
ON public.catalog_metadata 
FOR SELECT 
USING (classification_code = 'PUBLIC' AND is_published = true);

CREATE POLICY "Users can view their own organization datasets" 
ON public.catalog_metadata 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_catalog_metadata_updated_at
BEFORE UPDATE ON public.catalog_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();