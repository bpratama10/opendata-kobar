-- Apply RLS policies to allow public read access to data tables
-- This ensures that anonymous users can view and download dataset contents
-- Fixed to use correct table names from schema.md

-- 1. Grant read access to `data_indicators`
CREATE POLICY "Public can read data indicators"
ON public.data_indicators
FOR SELECT USING (true);

-- 2. Grant read access to `data_table_view_columns`
CREATE POLICY "Public can read data table view columns"
ON public.data_table_view_columns
FOR SELECT USING (true);

-- 3. Grant read access to `data_points`
CREATE POLICY "Public can read data points"
ON public.data_points
FOR SELECT USING (true);

-- 4. Enable RLS on all three tables if it's not already enabled
ALTER TABLE public.data_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_table_view_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_points ENABLE ROW LEVEL SECURITY;

-- 5. Ensure that only authenticated users can make changes
CREATE POLICY "Authenticated users can manage data indicators"
ON public.data_indicators FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage data table view columns"
ON public.data_table_view_columns FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage data points"
ON public.data_points FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Important: Drop any overly restrictive default policies if necessary
-- For example, if a 'DENY ALL' policy exists, it might need to be removed
-- This script assumes a standard setup and adds permissive read policies.
