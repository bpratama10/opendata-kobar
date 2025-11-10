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
  is_priority?: boolean;
  priorityDatasetId?: string | null;
  primaryResource?: {
    id: string;
    name: string;
    indicatorTitle?: string | null;
    unit?: string | null;
    frequency?: string | null;
    aggregationMethod?: string | null;
    timeDimension?: string | null;
    chartType?: string | null;
    interpretation?: string | null;
    isTimeSeries?: boolean | null;
  };
}

type TagRelation = {
  catalog_tags?: {
    name?: string | null;
  } | null;
};

type ThemeRelation = {
  catalog_themes?: {
    name?: string | null;
  } | null;
};

export const useDatasets = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasets = async () => {
    try {
      setLoading(true);

      // Fetch published datasets with their tags, themes, distributions, and is_priority status
      const { data: metadataData, error: metadataError } = await supabase
        .from('catalog_metadata')
        .select(`
          *,
          is_priority,
          priority_dataset_id,
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
            resource_type,
            indicator_title,
            unit,
            frequency,
            aggregation_method,
            time_dimension,
            chart_type,
            interpretation,
            is_timeseries,
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

      // Fetch priority datasets that haven't been converted yet
      const { data: priorityData, error: priorityError } = await supabase
        .from('priority_datasets')
        .select(`
          *,
          org_organizations!priority_datasets_assigned_org_fkey (
            name,
            short_name
          )
        `)
        .in('status', ['unassigned', 'claimed', 'assigned'])
        .order('updated_at', { ascending: false });

      if (priorityError) {
        throw priorityError;
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
        const tags = Array.isArray(dataset.catalog_dataset_tags)
          ? (dataset.catalog_dataset_tags as TagRelation[])
              .map((relation) => relation.catalog_tags?.name)
              .filter((name): name is string => typeof name === "string")
          : [];

        // Extract themes from the nested relationship
        const themes = Array.isArray(dataset.catalog_dataset_themes)
          ? (dataset.catalog_dataset_themes as ThemeRelation[])
              .map((relation) => relation.catalog_themes?.name)
              .filter((name): name is string => typeof name === "string")
          : [];

        // Get file info from distributions
        const resources = dataset.catalog_resources || [];
        const mainResource = resources[0];
        const distributions = mainResource?.catalog_distributions || [];
        const mainDistribution = distributions[0];

        const primaryResource = mainResource
          ? {
              id: mainResource.id,
              name: mainResource.name,
              indicatorTitle: mainResource.indicator_title ?? null,
              unit: mainResource.unit ?? null,
              frequency: mainResource.frequency ?? null,
              aggregationMethod: mainResource.aggregation_method ?? null,
              timeDimension: mainResource.time_dimension ?? null,
              chartType: mainResource.chart_type ?? null,
              interpretation: mainResource.interpretation ?? null,
              isTimeSeries: mainResource.is_timeseries ?? null,
            }
          : undefined;

        // Get telemetry counts
        const downloadCount = downloadCountMap.get(dataset.id) || 0;
        const viewCount = viewCountMap.get(dataset.id) || 0;

        // Use first theme as category, or "Uncategorized" if no themes
        const category = themes.length > 0 ? themes[0] : 'Uncategorized';

        const priorityDatasetId = dataset.priority_dataset_id ?? null;

        return {
          id: dataset.id,
          slug: dataset.slug,
          title: dataset.title,
          description: dataset.abstract || dataset.description || "",
          abstract: dataset.abstract,
          tags,
          themes,
          downloadCount: Number(downloadCount),
          viewCount: Number(viewCount),
          lastUpdated: new Date(dataset.updated_at).toLocaleDateString(),
          size: mainDistribution?.byte_size
            ? `${(mainDistribution.byte_size / 1024 / 1024).toFixed(1)} MB`
            : "Unknown",
          format: mainDistribution?.media_type || "Various",
          category,
          source: dataset.contact_email || "Unknown",
          classification_code: dataset.classification_code || "PUBLIC",
          publication_status: dataset.publication_status,
          contact_email: dataset.contact_email,
          language: dataset.language,
          maintainers: Array.isArray(dataset.maintainers)
            ? dataset.maintainers.filter((m): m is string => typeof m === "string")
            : [],
          is_priority: dataset.is_priority ?? false,
          priorityDatasetId,
          primaryResource,
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
