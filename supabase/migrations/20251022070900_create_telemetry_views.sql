-- Create telemetry_views table for tracking dataset page views
CREATE TABLE public.telemetry_views (
  id BIGSERIAL PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.catalog_metadata(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Fixed: Reference auth.users instead of org_users
  session_id VARCHAR(255), -- Optional: for anonymous view tracking
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for telemetry_views
CREATE INDEX idx_telemetry_views_dataset_id ON public.telemetry_views(dataset_id);
CREATE INDEX idx_telemetry_views_user_id ON public.telemetry_views(user_id);
CREATE INDEX idx_telemetry_views_created_at ON public.telemetry_views(created_at);
CREATE INDEX idx_telemetry_views_session_id ON public.telemetry_views(session_id);

-- Enable RLS for telemetry_views
ALTER TABLE public.telemetry_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telemetry_views
-- Views can be inserted by anyone (including anonymous users)
CREATE POLICY "Anyone can insert view records" ON public.telemetry_views
FOR INSERT WITH CHECK (true);

-- Only authenticated users can view their own view records
CREATE POLICY "Users can view their own view records" ON public.telemetry_views
FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);
