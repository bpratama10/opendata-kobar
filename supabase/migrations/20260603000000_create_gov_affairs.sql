-- Create gov_affairs table
CREATE TABLE IF NOT EXISTS public.gov_affairs (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gov_affairs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for gov_affairs
CREATE POLICY "Public can view gov_affairs" 
ON public.gov_affairs 
FOR SELECT 
USING (true);

CREATE POLICY "Admins/Walidata can manage gov_affairs" 
ON public.gov_affairs 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    has_role('ADMIN') OR has_role('WALIDATA')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role('ADMIN') OR has_role('WALIDATA')
  )
);

-- Insert starter values
INSERT INTO public.gov_affairs (code, name) VALUES
('1.01', 'Urusan Pemerintahan Bidang Pendidikan'),
('1.02', 'Urusan Pemerintahan Bidang Kesehatan'),
('1.03', 'Urusan Pemerintahan Bidang Pekerjaan Umum dan Penataan Ruang'),
('1.04', 'Urusan Pemerintahan Bidang Perumahan Rakyat dan Kawasan Permukiman'),
('1.05', 'Urusan Pemerintahan Bidang Ketentraman dan Ketertiban Umum serta Perlindungan Masyarakat'),
('1.06', 'Urusan Pemerintahan Bidang Sosial')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Add urusan_code column to catalog_metadata table
ALTER TABLE public.catalog_metadata 
ADD COLUMN IF NOT EXISTS urusan_code VARCHAR(10) REFERENCES public.gov_affairs(code) ON DELETE SET NULL;
