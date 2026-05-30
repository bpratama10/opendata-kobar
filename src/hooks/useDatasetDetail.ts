import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dataset } from "./useDatasets";

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

type ResourceRelation = {
  id: string;
  name: string;
  description?: string | null;
  resource_type: string;
  indicator_title?: string | null;
  unit?: string | null;
  frequency?: string | null;
  aggregation_method?: string | null;
  time_dimension?: string | null;
  chart_type?: string | null;
  interpretation?: string | null;
  is_timeseries?: boolean | null;
  catalog_distributions?: Array<{
    media_type?: string | null;
    byte_size?: number | null;
    version?: string | null;
  }> | null;
};

export const useDatasetDetail = (slug: string) => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataset = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('catalog_metadata')
        .select(`
          *,
          organization:org_organizations!fk_catalog_metadata_publisher_org_id (
            id,
            name,
            short_name
          ),
          license:lisensi!fk_catalog_metadata_license_code (
            code,
            name,
            url,
            notes
          ),
          frequency:freq_upd!fk_catalog_metadata_update_frequency_code (
            code,
            name,
            notes
          ),
          catalog_dataset_spatial_coverage (
            spatial_unit:spatial_units!catalog_dataset_spatial_coverage_spatial_id_fkey (
              id,
              name,
              code,
              level
            )
          ),
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
      const tags = Array.isArray(data.catalog_dataset_tags)
        ? (data.catalog_dataset_tags as TagRelation[])
            .map((relation) => relation.catalog_tags?.name)
            .filter((name): name is string => typeof name === "string")
        : [];
      const themes = Array.isArray(data.catalog_dataset_themes)
        ? (data.catalog_dataset_themes as ThemeRelation[])
            .map((relation) => relation.catalog_themes?.name)
            .filter((name): name is string => typeof name === "string")
        : [];
      
      // Parse maintainers array
      const maintainers: string[] = Array.isArray(data.maintainers) 
        ? data.maintainers.filter((m): m is string => typeof m === 'string')
        : [];
      
      // Get file info from resources and distributions
      const resources = (data.catalog_resources || []) as ResourceRelation[];
      const mainResource = resources[0];
      const distributions = mainResource?.catalog_distributions || [];
      const mainDistribution = distributions[0];

      // Parse spatial coverage
      const spatialCoverageRaw = (data as any).catalog_dataset_spatial_coverage;
      const spatial_coverage = Array.isArray(spatialCoverageRaw)
        ? spatialCoverageRaw
            .map((item: any) => item.spatial_unit)
            .filter((unit): unit is any => !!unit)
            .map((unit: any) => ({
              id: unit.id,
              name: unit.name,
              code: unit.code,
              level: unit.level,
            }))
        : [];

      // Calculate download count using the aggregate function
      const { data: downloadCountData, error: downloadCountError } = await supabase
        .rpc('get_dataset_download_count', { dataset_id_param: data.id });

      const downloadCount = downloadCountError ? 0 : (downloadCountData || 0);

      const orgRaw = (data as any).organization;
      const organization = orgRaw
        ? {
            id: orgRaw.id,
            name: orgRaw.name,
            short_name: orgRaw.short_name,
          }
        : null;

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
        version: mainDistribution?.version || "1.0.0",
        primaryResource: mainResource
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
          : undefined,
        category: themes.length > 0 ? themes[0] : 'Uncategorized',
        source: data.contact_email || 'Unknown',
        classification_code: data.classification_code,
        publication_status: data.publication_status,
        contact_email: data.contact_email,
        language: data.language,
        maintainers,
        organization,
        is_priority: data.is_priority ?? false,
        priorityDatasetId: data.priority_dataset_id ?? null,
        temporal_start: data.temporal_start,
        temporal_end: data.temporal_end,
        created_at: data.created_at,
        license_code: data.license_code,
        custom_id: (data as any).custom_id,
        license: (data as any).license ? {
          code: (data as any).license.code,
          name: (data as any).license.name,
          url: (data as any).license.url,
          notes: (data as any).license.notes,
        } : null,
        frequency: (data as any).frequency ? {
          code: (data as any).frequency.code,
          name: (data as any).frequency.name,
          notes: (data as any).frequency.notes,
        } : null,
        spatial_coverage,
      };

      setDataset(transformedDataset);
      setError(null);
    } catch (err) {
      console.error('Error fetching dataset:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dataset');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchDataset();
    }
  }, [slug, fetchDataset]);

  return {
    dataset,
    loading,
    error,
    refetch: fetchDataset
  };
};
