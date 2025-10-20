-- Create TABLE resources for existing datasets
INSERT INTO catalog_resources (dataset_id, resource_type, name, description) VALUES
  ('66376ef1-0664-4a7d-9901-843f2741e7bd', 'TABLE', 'Population Data Table', 'Population statistics by demographics'),
  ('3d03ec52-a66c-40b7-bad6-5fae1732b63a', 'TABLE', 'Air Quality Measurements', 'Daily air quality index measurements'),
  ('10eaea8b-bce0-424d-a477-9e7a157f8733', 'TABLE', 'Education Statistics Table', 'Education enrollment and performance data');

-- Create indicators for Population Census dataset
INSERT INTO data_indicators (resource_id, code, label, unit, description, order_no, is_active)
SELECT 
  r.id,
  indicator_data.code,
  indicator_data.label,
  indicator_data.unit,
  indicator_data.description,
  indicator_data.order_no,
  true
FROM catalog_resources r
CROSS JOIN (VALUES 
  ('TOTAL_POP', 'Total Population', 'persons', 'Total population count', 1),
  ('MALE_POP', 'Male Population', 'persons', 'Male population count', 2),
  ('FEMALE_POP', 'Female Population', 'persons', 'Female population count', 3)
) AS indicator_data(code, label, unit, description, order_no)
WHERE r.dataset_id = '66376ef1-0664-4a7d-9901-843f2741e7bd' 
  AND r.resource_type = 'TABLE';

-- Create indicators for Air Quality dataset  
INSERT INTO data_indicators (resource_id, code, label, unit, description, order_no, is_active)
SELECT 
  r.id,
  indicator_data.code,
  indicator_data.label,
  indicator_data.unit,
  indicator_data.description,
  indicator_data.order_no,
  true
FROM catalog_resources r
CROSS JOIN (VALUES 
  ('PM25', 'PM2.5 Concentration', 'µg/m³', 'Fine particulate matter concentration', 1),
  ('PM10', 'PM10 Concentration', 'µg/m³', 'Coarse particulate matter concentration', 2),
  ('AQI', 'Air Quality Index', 'index', 'Overall air quality index score', 3)
) AS indicator_data(code, label, unit, description, order_no)
WHERE r.dataset_id = '3d03ec52-a66c-40b7-bad6-5fae1732b63a' 
  AND r.resource_type = 'TABLE';

-- Create indicators for Education dataset
INSERT INTO data_indicators (resource_id, code, label, unit, description, order_no, is_active)
SELECT 
  r.id,
  indicator_data.code,
  indicator_data.label,
  indicator_data.unit,
  indicator_data.description,
  indicator_data.order_no,
  true
FROM catalog_resources r
CROSS JOIN (VALUES 
  ('ENROLLMENT', 'Total Enrollment', 'students', 'Total student enrollment', 1),
  ('GRADUATION_RATE', 'Graduation Rate', '%', 'Percentage of students graduating', 2),
  ('LITERACY_RATE', 'Literacy Rate', '%', 'Adult literacy percentage', 3)
) AS indicator_data(code, label, unit, description, order_no)
WHERE r.dataset_id = '10eaea8b-bce0-424d-a477-9e7a157f8733' 
  AND r.resource_type = 'TABLE';