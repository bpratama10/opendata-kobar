import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Dataset {
  id: string;
  slug: string;
  title: string;
  description: string;
  abstract?: string;
  tags: string[];
  themes: string[];
  downloadCount: number;
  lastUpdated: string;
  size: string;
  format: string;
  category: string;
  source: string;
  classification_code: string;
  publication_status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  contact_email?: string;
  language?: string;
  maintainers?: string[];
}

export const useDatasets = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      
      // Fetch published datasets with their tags and themes
      const { data: metadataData, error: metadataError } = await supabase
        .from('catalog_metadata')
        .select(`
          *,
          catalog_dataset_tags (
            catalog_tags (
              name
            )
          ),
          catalog_dataset_themes (
            catalog_themes (
              name
            )
          )
        `)
        .eq('publication_status', 'PUBLISHED')
        .order('updated_at', { ascending: false });

      if (metadataError) {
        throw metadataError;
      }

      // Transform the data to match frontend expectations
      const transformedDatasets: Dataset[] = (metadataData || []).map((dataset) => {
        // Extract tags from the nested relationship
        const tags = dataset.catalog_dataset_tags?.map((dt: any) => dt.catalog_tags?.name).filter(Boolean) || [];
        
        // Extract themes from the nested relationship
        const themes = dataset.catalog_dataset_themes?.map((dt: any) => dt.catalog_themes?.name).filter(Boolean) || [];
        
        // Use first theme as category, or "Uncategorized" if no themes
        const category = themes.length > 0 ? themes[0] : 'Uncategorized';
        
        return {
          id: dataset.id,
          slug: dataset.slug,
          title: dataset.title,
          description: dataset.abstract || dataset.description || '',
          abstract: dataset.abstract,
          tags,
          themes,
          downloadCount: 0, // We'll need to calculate this from telemetry_downloads later
          lastUpdated: new Date(dataset.updated_at).toLocaleDateString(),
          size: "Unknown", // We'll need to get this from distributions
          format: "Various", // We'll need to get this from distributions  
          category,
          source: dataset.contact_email || 'Unknown',
          classification_code: dataset.classification_code || 'PUBLIC',
          publication_status: dataset.publication_status,
          contact_email: dataset.contact_email,
          language: dataset.language,
          maintainers: Array.isArray(dataset.maintainers)
            ? dataset.maintainers.filter((m): m is string => typeof m === 'string')
            : []
        };
      });

      setDatasets(transformedDatasets);
      setError(null);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  return {
    datasets,
    loading,
    error,
    refetch: fetchDatasets
  };
};