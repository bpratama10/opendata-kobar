-- Create ENUM types
CREATE TYPE public.org_type AS ENUM ('WALIDATA', 'PRODUSEN_DATA', 'KOORDINATOR', 'LAINNYA');
CREATE TYPE public.resource_type AS ENUM ('TABLE', 'FILE', 'API', 'LINK');
CREATE TYPE public.availability_type AS ENUM ('online', 'offline', 'archived');
CREATE TYPE public.spatial_level AS ENUM ('PROV', 'KAB', 'KEC', 'DESA', 'KEL', 'OTHER');
CREATE TYPE public.download_channel AS ENUM ('portal', 'api', 'internal');
CREATE TYPE public.policy_rule AS ENUM ('VIEW', 'DOWNLOAD', 'UPDATE', 'ADMIN');
CREATE TYPE public.policy_subject_type AS ENUM ('USER', 'ROLE', 'ORG');

-- ========================================
-- a) Organisasi & Pengguna (org_...)
-- ========================================

-- 1) org_organizations
CREATE TABLE public.org_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(50),
  org_type org_type NOT NULL,
  parent_id UUID REFERENCES public.org_organizations(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) org_users
CREATE TABLE public.org_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255),
  org_id UUID REFERENCES public.org_organizations(id),
  is_active BOOLEAN DEFAULT true,
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) org_roles  
CREATE TABLE public.org_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4) org_user_roles (many-to-many)
CREATE TABLE public.org_user_roles (
  user_id UUID NOT NULL REFERENCES public.org_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.org_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ========================================
-- c) Cakupan Dataset & Referensi (Create before catalog_metadata references)
-- ========================================

-- 2) lisensi
CREATE TABLE public.lisensi (
  code VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  url VARCHAR(255),
  notes TEXT
);

-- 3) freq_upd
CREATE TABLE public.freq_upd (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  notes TEXT
);

-- 1) spatial_units (without geometry for now)
CREATE TABLE public.spatial_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(20) NOT NULL,
  level spatial_level NOT NULL,
  parent_id UUID REFERENCES public.spatial_units(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ========================================
-- b) Katalog Metadata/Detail Data/Dataset (catalog_...)
-- ========================================

-- Add foreign key constraints to existing catalog_metadata table
ALTER TABLE public.catalog_metadata 
ADD CONSTRAINT fk_catalog_metadata_org_id 
FOREIGN KEY (org_id) REFERENCES public.org_organizations(id);

ALTER TABLE public.catalog_metadata 
ADD CONSTRAINT fk_catalog_metadata_publisher_org_id 
FOREIGN KEY (publisher_org_id) REFERENCES public.org_organizations(id);

ALTER TABLE public.catalog_metadata 
ADD CONSTRAINT fk_catalog_metadata_created_by 
FOREIGN KEY (created_by) REFERENCES public.org_users(id);

ALTER TABLE public.catalog_metadata 
ADD CONSTRAINT fk_catalog_metadata_updated_by 
FOREIGN KEY (updated_by) REFERENCES public.org_users(id);

ALTER TABLE public.catalog_metadata 
ADD CONSTRAINT fk_catalog_metadata_license_code 
FOREIGN KEY (license_code) REFERENCES public.lisensi(code);

ALTER TABLE public.catalog_metadata 
ADD CONSTRAINT fk_catalog_metadata_update_frequency_code 
FOREIGN KEY (update_frequency_code) REFERENCES public.freq_upd(code);

-- 2) catalog_resources
CREATE TABLE public.catalog_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.catalog_metadata(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  resource_type resource_type NOT NULL,
  schema_json JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) catalog_distributions
CREATE TABLE public.catalog_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.catalog_resources(id) ON DELETE CASCADE,
  version VARCHAR(60) NOT NULL,
  media_type VARCHAR(100) NOT NULL,
  byte_size BIGINT,
  checksum_sha256 CHAR(64),
  storage_uri VARCHAR(1024),
  availability availability_type DEFAULT 'online',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4) catalog_tags
CREATE TABLE public.catalog_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL
);

-- catalog_dataset_tags (many-to-many)
CREATE TABLE public.catalog_dataset_tags (
  dataset_id UUID NOT NULL REFERENCES public.catalog_metadata(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.catalog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (dataset_id, tag_id)
);

-- 5) catalog_themes
CREATE TABLE public.catalog_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL
);

-- catalog_dataset_themes
CREATE TABLE public.catalog_dataset_themes (
  dataset_id UUID NOT NULL REFERENCES public.catalog_metadata(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.catalog_themes(id) ON DELETE CASCADE,
  PRIMARY KEY (dataset_id, theme_id)
);

-- 6) catalog_data_classifications
CREATE TABLE public.catalog_data_classifications (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  notes TEXT
);

-- catalog_dataset_spatial_coverage
CREATE TABLE public.catalog_dataset_spatial_coverage (
  dataset_id UUID NOT NULL REFERENCES public.catalog_metadata(id) ON DELETE CASCADE,
  spatial_id UUID NOT NULL REFERENCES public.spatial_units(id) ON DELETE CASCADE,
  PRIMARY KEY (dataset_id, spatial_id)
);

-- ========================================
-- d) Logging (telemetry_...)
-- ========================================

-- 1) telemetry_audit_events
CREATE TABLE public.telemetry_audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES public.org_users(id),
  action VARCHAR(60) NOT NULL,
  object_type VARCHAR(40),
  object_id UUID,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) telemetry_downloads
CREATE TABLE public.telemetry_downloads (
  id BIGSERIAL PRIMARY KEY,
  distribution_id UUID NOT NULL REFERENCES public.catalog_distributions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.org_users(id),
  channel download_channel NOT NULL,
  client_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- (Optional) Dataset Policies
-- ========================================

-- gov_dataset_policies
CREATE TABLE public.gov_dataset_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.catalog_metadata(id) ON DELETE CASCADE,
  rule policy_rule NOT NULL,
  subject_type policy_subject_type NOT NULL,
  subject_id UUID,
  constraint_text VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- Create Indexes
-- ========================================

-- org_organizations indexes
CREATE INDEX idx_org_organizations_name ON public.org_organizations(name);
CREATE INDEX idx_org_organizations_org_type ON public.org_organizations(org_type);
CREATE INDEX idx_org_organizations_parent_id ON public.org_organizations(parent_id);

-- org_users indexes
CREATE INDEX idx_org_users_org_id ON public.org_users(org_id);
CREATE INDEX idx_org_users_is_active ON public.org_users(is_active);

-- org_user_roles indexes
CREATE INDEX idx_org_user_roles_role_id ON public.org_user_roles(role_id);

-- catalog_resources indexes
CREATE INDEX idx_catalog_resources_dataset_id ON public.catalog_resources(dataset_id);
CREATE INDEX idx_catalog_resources_resource_type ON public.catalog_resources(resource_type);

-- catalog_distributions indexes
CREATE INDEX idx_catalog_distributions_resource_id ON public.catalog_distributions(resource_id);
CREATE INDEX idx_catalog_distributions_version ON public.catalog_distributions(version);

-- catalog_dataset_tags indexes
CREATE INDEX idx_catalog_dataset_tags_tag_id ON public.catalog_dataset_tags(tag_id);

-- spatial_units indexes
CREATE INDEX idx_spatial_units_level ON public.spatial_units(level);
CREATE INDEX idx_spatial_units_code ON public.spatial_units(code);

-- telemetry_audit_events indexes
CREATE INDEX idx_telemetry_audit_events_actor_id ON public.telemetry_audit_events(actor_id);
CREATE INDEX idx_telemetry_audit_events_object ON public.telemetry_audit_events(object_type, object_id);
CREATE INDEX idx_telemetry_audit_events_created_at ON public.telemetry_audit_events(created_at);

-- telemetry_downloads indexes
CREATE INDEX idx_telemetry_downloads_distribution_id ON public.telemetry_downloads(distribution_id);
CREATE INDEX idx_telemetry_downloads_user_id ON public.telemetry_downloads(user_id);
CREATE INDEX idx_telemetry_downloads_created_at ON public.telemetry_downloads(created_at);
CREATE INDEX idx_telemetry_downloads_channel ON public.telemetry_downloads(channel);

-- gov_dataset_policies indexes
CREATE INDEX idx_gov_dataset_policies_dataset_id ON public.gov_dataset_policies(dataset_id);
CREATE INDEX idx_gov_dataset_policies_subject ON public.gov_dataset_policies(subject_type, subject_id);
CREATE INDEX idx_gov_dataset_policies_rule ON public.gov_dataset_policies(rule);

-- ========================================
-- Insert Initial Data
-- ========================================

-- Insert role seed data
INSERT INTO public.org_roles (code, name) VALUES
('ADMIN', 'Administrator'),
('WALIDATA', 'Wali Data'),
('PRODUSEN', 'Produsen Data'),
('VIEWER', 'Viewer'),
('KOORDINATOR', 'Koordinator');

-- Insert classification seed data
INSERT INTO public.catalog_data_classifications (code, name, notes) VALUES
('PUBLIC', 'Publik', 'Data dapat diakses oleh umum'),
('TERBATAS', 'Terbatas', 'Data dengan akses terbatas');

-- Insert license seed data
INSERT INTO public.lisensi (code, name, url) VALUES
('CC-BY-4.0', 'Creative Commons Attribution 4.0', 'https://creativecommons.org/licenses/by/4.0/'),
('CC-BY-NC-4.0', 'Creative Commons Attribution-NonCommercial 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/'),
('ODC-BY', 'Open Data Commons Attribution License', 'https://opendatacommons.org/licenses/by/'),
('CUSTOM', 'Custom License', NULL);

-- Insert frequency update seed data
INSERT INTO public.freq_upd (code, name, notes) VALUES
('HAR', 'Harian', 'Diperbarui setiap hari'),
('BLN', 'Bulanan', 'Diperbarui setiap bulan'),
('TRI', 'Triwulan', 'Diperbarui setiap 3 bulan'),
('SEM', 'Semester', 'Diperbarui setiap 6 bulan'),
('TAH', 'Tahunan', 'Diperbarui setiap tahun'),
('HUB', 'Hubungi Penyedia', 'Frekuensi tidak tetap, hubungi penyedia data');

-- ========================================
-- Enable Row Level Security
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.org_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_dataset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_dataset_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_data_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_dataset_spatial_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lisensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freq_upd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_dataset_policies ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Create Triggers for Updated At
-- ========================================

-- Triggers for org_organizations
CREATE TRIGGER update_org_organizations_updated_at
BEFORE UPDATE ON public.org_organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for org_users
CREATE TRIGGER update_org_users_updated_at
BEFORE UPDATE ON public.org_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for catalog_resources
CREATE TRIGGER update_catalog_resources_updated_at
BEFORE UPDATE ON public.catalog_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();