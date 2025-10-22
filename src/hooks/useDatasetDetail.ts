import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dataset } from "./useDatasets";

export const useDatasetDetail = (slug: string) => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataset = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
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
          ),
          catalog_resources (
            id,
            name,
            description,
            resource_type,
            catalog_distributions (
              media_type,
              byte_size,
              version
            )
          )
        `)
        .eq('slug', slug)
        .eq('publication_status', 'PUBLISHED')
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Dataset not found');
        } else {
          throw fetchError;
        }
        return;
      }

      // Transform the data
      const tags = data.catalog_dataset_tags?.map((dt: any) => dt.catalog_tags?.name).filter(Boolean) || [];
      const themes = data.catalog_dataset_themes?.map((dt: any) => dt.catalog_themes?.name).filter(Boolean) || [];
      
      // Parse maintainers array
      const maintainers: string[] = Array.isArray(data.maintainers) 
        ? data.maintainers.filter((m): m is string => typeof m === 'string')
        : [];
      
      // Get file info from resources and distributions
      const resources = data.catalog_resources || [];
      const mainResource = resources[0];
      const distributions = mainResource?.catalog_distributions || [];
      const mainDistribution = distributions[0];

      // Calculate download count using the aggregate function
      const { data: downloadCountData, error: downloadCountError } = await supabase
        .rpc('get_dataset_download_count', { dataset_id_param: data.id });

      const downloadCount = downloadCountError ? 0 : (downloadCountData || 0);

      const transformedDataset: Dataset = {
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.abstract || data.description || '',
        abstract: data.abstract,
        tags,
        themes,
        downloadCount,
        lastUpdated: new Date(data.updated_at).toLocaleDateString(),
        size: mainDistribution?.byte_size ? `${(mainDistribution.byte_size / 1024 / 1024).toFixed(1)} MB` : "Unknown",
        format: mainDistribution?.media_type || "Various",
        category: themes.length > 0 ? themes[0] : 'Uncategorized',
        source: data.contact_email || 'Unknown',
        classification_code: data.classification_code,
        publication_status: data.publication_status,
        contact_email: data.contact_email,
        language: data.language,
        maintainers: maintainers
      };

      setDataset(transformedDataset);
      setError(null);
    } catch (err) {
      console.error('Error fetching dataset:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dataset');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchDataset();
    }
  }, [slug]);

  return {
    dataset,
    loading,
    error,
    refetch: fetchDataset
  };
};
