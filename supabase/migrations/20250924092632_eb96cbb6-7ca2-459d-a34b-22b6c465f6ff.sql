-- Insert dummy datasets only
INSERT INTO catalog_metadata (
  title, slug, abstract, description, classification_code, is_published, 
  contact_email, language
) VALUES
('Population Census 2020', 'population-census-2020', 
 'Complete population census data for Indonesia 2020', 
 'Comprehensive demographic data including age, gender, education level, and geographic distribution from the 2020 national census.',
 'PUBLIC', true, 'data@bps.go.id', 'id'),

('Jakarta Air Quality Index', 'jakarta-air-quality-index',
 'Daily air quality measurements for Jakarta metropolitan area',
 'Real-time and historical air quality data including PM2.5, PM10, SO2, NO2, O3, and CO measurements from monitoring stations across Jakarta.',
 'PUBLIC', true, 'environment@jakarta.go.id', 'id'),

('Education Statistics 2023', 'education-statistics-2023',
 'National education statistics including enrollment, graduation rates',
 'Comprehensive education data covering primary, secondary, and higher education including student enrollment, teacher statistics, and infrastructure data.',
 'PUBLIC', true, 'stats@kemendikbud.go.id', 'id')

ON CONFLICT (slug) DO NOTHING;

-- Insert some tags
INSERT INTO catalog_tags (name) VALUES
('population'), ('statistics'), ('research'), ('geospatial'), ('government')
ON CONFLICT DO NOTHING;