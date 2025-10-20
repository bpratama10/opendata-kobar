-- Add RLS policies to allow authenticated users to manage dataset metadata
CREATE POLICY "Authenticated users can create datasets" 
ON catalog_metadata 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update datasets" 
ON catalog_metadata 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete datasets" 
ON catalog_metadata 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Add policies for tags management
CREATE POLICY "Authenticated users can update tags" 
ON catalog_tags 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tags" 
ON catalog_tags 
FOR DELETE 
USING (auth.uid() IS NOT NULL);