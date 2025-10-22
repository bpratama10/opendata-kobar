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
  viewCount?: number; // Add view count for sorting
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

      // Fetch published datasets with their tags, themes, and distributions
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
          ),
          catalog_resources (
            catalog_distributions (
              media_type,
              byte_size,
              version
            )
          )
        `)
        .eq('publication_status', 'PUBLISHED')
        .order('updated_at', { ascending: false });

      if (metadataError) {
        throw metadataError;
      }

      // Get dataset IDs for bulk telemetry queries
      const datasetIds = (metadataData || []).map(d => d.id);

      // Fetch download and view counts in bulk
      const [downloadCountsResult, viewCountsResult] = await Promise.allSettled([
        datasetIds.length > 0 ? supabase.rpc('get_datasets_download_counts', { dataset_ids: datasetIds }) : Promise.resolve({ data: [] }),
        datasetIds.length > 0 ? supabase.rpc('get_datasets_view_counts', { dataset_ids: datasetIds }) : Promise.resolve({ data: [] })
      ]);

      const downloadCounts = downloadCountsResult.status === 'fulfilled' ? downloadCountsResult.value.data || [] : [];
      const viewCounts = viewCountsResult.status === 'fulfilled' ? viewCountsResult.value.data || [] : [];

      // Create lookup maps with proper typing
      const downloadCountMap = new Map(downloadCounts.map((dc: { dataset_id: string; download_count: number }) => [dc.dataset_id, dc.download_count]));
      const viewCountMap = new Map(viewCounts.map((vc: { dataset_id: string; view_count: number }) => [vc.dataset_id, vc.view_count]));

      // Transform the data to match frontend expectations
      const transformedDatasets: Dataset[] = (metadataData || []).map((dataset) => {
        // Extract tags from the nested relationship
        const tags = dataset.catalog_dataset_tags?.map((dt: any) => dt.catalog_tags?.name).filter(Boolean) || [];

        // Extract themes from the nested relationship
        const themes = dataset.catalog_dataset_themes?.map((dt: any) => dt.catalog_themes?.name).filter(Boolean) || [];

        // Get file info from distributions
        const resources = dataset.catalog_resources || [];
        const mainResource = resources[0];
        const distributions = mainResource?.catalog_distributions || [];
        const mainDistribution = distributions[0];

        // Get telemetry counts
        const downloadCount = downloadCountMap.get(dataset.id) || 0;
        const viewCount = viewCountMap.get(dataset.id) || 0;

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
          downloadCount: Number(downloadCount),
          viewCount: Number(viewCount), // Add view count for sorting
          lastUpdated: new Date(dataset.updated_at).toLocaleDateString(),
          size: mainDistribution?.byte_size ? `${(mainDistribution.byte_size / 1024 / 1024).toFixed(1)} MB` : "Unknown",
          format: mainDistribution?.media_type || "Various",
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
