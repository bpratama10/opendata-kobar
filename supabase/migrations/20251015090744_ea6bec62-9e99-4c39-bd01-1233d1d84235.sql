-- Add unique constraint for data_points upsert conflict resolution
-- This ensures one data point per indicator, period, and resource combination
CREATE UNIQUE INDEX IF NOT EXISTS unique_data_point_indicator_period_resource 
ON public.data_points (indicator_id, period_start, resource_id);