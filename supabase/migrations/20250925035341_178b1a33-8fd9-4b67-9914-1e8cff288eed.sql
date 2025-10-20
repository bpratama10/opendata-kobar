-- Create sample data points for Population Census (2020-2023)
INSERT INTO data_points (indicator_id, resource_id, time_grain, period_start, period_label, value, qualifier)
SELECT 
  di.id as indicator_id,
  di.resource_id,
  'YEAR'::time_grain_type,
  make_date(2020 + years.yr, 1, 1) as period_start,
  (2020 + years.yr)::text as period_label,
  CASE 
    WHEN di.code = 'TOTAL_POP' THEN 275000000 + (years.yr * 2500000)
    WHEN di.code = 'MALE_POP' THEN 138000000 + (years.yr * 1250000)
    WHEN di.code = 'FEMALE_POP' THEN 137000000 + (years.yr * 1250000)
  END as value,
  CASE WHEN years.yr = 3 THEN 'PRELIM'::qualifier_type ELSE 'OFFICIAL'::qualifier_type END as qualifier
FROM data_indicators di
JOIN catalog_resources cr ON di.resource_id = cr.id
CROSS JOIN generate_series(0, 3) years(yr)
WHERE cr.dataset_id = '66376ef1-0664-4a7d-9901-843f2741e7bd';

-- Create sample data points for Air Quality (2021-2024)
INSERT INTO data_points (indicator_id, resource_id, time_grain, period_start, period_label, value, qualifier)
SELECT 
  di.id as indicator_id,
  di.resource_id,
  'YEAR'::time_grain_type,
  make_date(2021 + years.yr, 1, 1) as period_start,
  (2021 + years.yr)::text as period_label,
  CASE 
    WHEN di.code = 'PM25' THEN 35 + (years.yr * 2)
    WHEN di.code = 'PM10' THEN 65 + (years.yr * 3)
    WHEN di.code = 'AQI' THEN 95 + (years.yr * 5)
  END as value,
  CASE WHEN years.yr = 3 THEN 'PRELIM'::qualifier_type ELSE 'OFFICIAL'::qualifier_type END as qualifier
FROM data_indicators di
JOIN catalog_resources cr ON di.resource_id = cr.id
CROSS JOIN generate_series(0, 3) years(yr)
WHERE cr.dataset_id = '3d03ec52-a66c-40b7-bad6-5fae1732b63a';

-- Create sample data points for Education (2020-2023)
INSERT INTO data_points (indicator_id, resource_id, time_grain, period_start, period_label, value, qualifier)
SELECT 
  di.id as indicator_id,
  di.resource_id,
  'YEAR'::time_grain_type,
  make_date(2020 + years.yr, 1, 1) as period_start,
  (2020 + years.yr)::text as period_label,
  CASE 
    WHEN di.code = 'ENROLLMENT' THEN 50000000 + (years.yr * 500000)
    WHEN di.code = 'GRADUATION_RATE' THEN 85 + (years.yr * 1.5)
    WHEN di.code = 'LITERACY_RATE' THEN 93 + (years.yr * 0.8)
  END as value,
  CASE WHEN years.yr = 3 THEN 'PRELIM'::qualifier_type ELSE 'OFFICIAL'::qualifier_type END as qualifier
FROM data_indicators di
JOIN catalog_resources cr ON di.resource_id = cr.id
CROSS JOIN generate_series(0, 3) years(yr)
WHERE cr.dataset_id = '10eaea8b-bce0-424d-a477-9e7a157f8733';

-- Create table view columns for Population Census (2020-2023)
INSERT INTO data_table_view_columns (resource_id, time_grain, period_start, column_label, is_hidden, column_order)
SELECT 
  cr.id as resource_id,
  'YEAR'::time_grain_type,
  make_date(2020 + years.yr, 1, 1) as period_start,
  (2020 + years.yr)::text as column_label,
  false as is_hidden,
  years.yr + 1 as column_order
FROM catalog_resources cr
CROSS JOIN generate_series(0, 3) years(yr)
WHERE cr.dataset_id = '66376ef1-0664-4a7d-9901-843f2741e7bd' 
  AND cr.resource_type = 'TABLE';

-- Create table view columns for Air Quality (2021-2024)
INSERT INTO data_table_view_columns (resource_id, time_grain, period_start, column_label, is_hidden, column_order)
SELECT 
  cr.id as resource_id,
  'YEAR'::time_grain_type,
  make_date(2021 + years.yr, 1, 1) as period_start,
  (2021 + years.yr)::text as column_label,
  false as is_hidden,
  years.yr + 1 as column_order
FROM catalog_resources cr
CROSS JOIN generate_series(0, 3) years(yr)
WHERE cr.dataset_id = '3d03ec52-a66c-40b7-bad6-5fae1732b63a' 
  AND cr.resource_type = 'TABLE';

-- Create table view columns for Education (2020-2023)
INSERT INTO data_table_view_columns (resource_id, time_grain, period_start, column_label, is_hidden, column_order)
SELECT 
  cr.id as resource_id,
  'YEAR'::time_grain_type,
  make_date(2020 + years.yr, 1, 1) as period_start,
  (2020 + years.yr)::text as column_label,
  false as is_hidden,
  years.yr + 1 as column_order
FROM catalog_resources cr
CROSS JOIN generate_series(0, 3) years(yr)
WHERE cr.dataset_id = '10eaea8b-bce0-424d-a477-9e7a157f8733' 
  AND cr.resource_type = 'TABLE'

ON CONFLICT (resource_id, period_start) DO UPDATE SET
  column_label = EXCLUDED.column_label,
  is_hidden = EXCLUDED.is_hidden,
  column_order = EXCLUDED.column_order;