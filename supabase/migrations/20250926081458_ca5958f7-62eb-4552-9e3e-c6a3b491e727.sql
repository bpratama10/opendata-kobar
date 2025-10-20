-- Drop the existing unique constraint that uses distribution_id
ALTER TABLE data_points DROP CONSTRAINT IF EXISTS unique_indicator_period_distribution;

-- Create a new unique constraint that matches the code's expectation
ALTER TABLE data_points ADD CONSTRAINT unique_indicator_period_resource 
UNIQUE (indicator_id, period_start, resource_id);