-- Create enums for data tables
CREATE TYPE time_grain_type AS ENUM ('YEAR', 'QUARTER', 'MONTH');
CREATE TYPE qualifier_type AS ENUM ('NA', 'OFFICIAL', 'PRELIM', 'EST');

-- Create data_indicators table
CREATE TABLE public.data_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.catalog_resources(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  label VARCHAR(255) NOT NULL,
  unit VARCHAR(40),
  description TEXT,
  order_no INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create constraints and indexes for data_indicators
ALTER TABLE public.data_indicators ADD CONSTRAINT unique_resource_indicator_code UNIQUE (resource_id, code);
CREATE INDEX idx_data_indicators_resource_id ON public.data_indicators(resource_id);

-- Create data_points table
CREATE TABLE public.data_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.data_indicators(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.catalog_resources(id) ON DELETE CASCADE,
  time_grain time_grain_type NOT NULL,
  period_start DATE NOT NULL,
  period_label VARCHAR(20) NOT NULL,
  value NUMERIC(20,4),
  qualifier qualifier_type NOT NULL DEFAULT 'OFFICIAL',
  distribution_id UUID REFERENCES public.catalog_distributions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create constraints and indexes for data_points
ALTER TABLE public.data_points ADD CONSTRAINT unique_indicator_period_distribution UNIQUE (indicator_id, period_start, distribution_id);
CREATE INDEX idx_data_points_resource_period ON public.data_points(resource_id, period_start);
CREATE INDEX idx_data_points_indicator_period ON public.data_points(indicator_id, period_start);

-- Create data_table_view_columns table
CREATE TABLE public.data_table_view_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.catalog_resources(id) ON DELETE CASCADE,
  time_grain time_grain_type NOT NULL,
  period_start DATE NOT NULL,
  column_label VARCHAR(20) NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  column_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create constraints and indexes for data_table_view_columns
ALTER TABLE public.data_table_view_columns ADD CONSTRAINT unique_resource_period UNIQUE (resource_id, period_start);
CREATE INDEX idx_data_table_view_columns_resource_order ON public.data_table_view_columns(resource_id, column_order);
CREATE INDEX idx_data_table_view_columns_resource_hidden ON public.data_table_view_columns(resource_id, is_hidden);

-- Enable RLS on all tables
ALTER TABLE public.data_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_table_view_columns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for data_indicators
CREATE POLICY "Authenticated users can manage indicators" ON public.data_indicators
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public indicators are viewable by everyone" ON public.data_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM catalog_resources r
      JOIN catalog_metadata m ON r.dataset_id = m.id
      WHERE r.id = data_indicators.resource_id
        AND m.classification_code = 'PUBLIC'
        AND m.is_published = true
    )
  );

-- Create RLS policies for data_points
CREATE POLICY "Authenticated users can manage data points" ON public.data_points
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public data points are viewable by everyone" ON public.data_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM catalog_resources r
      JOIN catalog_metadata m ON r.dataset_id = m.id
      WHERE r.id = data_points.resource_id
        AND m.classification_code = 'PUBLIC'
        AND m.is_published = true
    )
  );

-- Create RLS policies for data_table_view_columns
CREATE POLICY "Authenticated users can manage table view columns" ON public.data_table_view_columns
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public table view columns are viewable by everyone" ON public.data_table_view_columns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM catalog_resources r
      JOIN catalog_metadata m ON r.dataset_id = m.id
      WHERE r.id = data_table_view_columns.resource_id
        AND m.classification_code = 'PUBLIC'
        AND m.is_published = true
    )
  );

-- Create triggers for updated_at columns
CREATE TRIGGER update_data_indicators_updated_at
  BEFORE UPDATE ON public.data_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_points_updated_at
  BEFORE UPDATE ON public.data_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_table_view_columns_updated_at
  BEFORE UPDATE ON public.data_table_view_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();