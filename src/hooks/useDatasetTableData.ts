import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DataIndicator {
  id: string;
  resource_id: string;
  code: string;
  label: string;
  unit?: string;
  description?: string;
  order_no: number;
  is_active: boolean;
}

export interface DataPoint {
  id: string;
  indicator_id: string;
  resource_id: string;
  time_grain: 'YEAR' | 'QUARTER' | 'MONTH';
  period_start: string;
  period_label: string;
  value?: number;
  qualifier: 'NA' | 'OFFICIAL' | 'PRELIM' | 'EST';
}

export interface TableColumn {
  id: string;
  resource_id: string;
  time_grain: 'YEAR' | 'QUARTER' | 'MONTH';
  period_start: string;
  column_label: string;
  is_hidden: boolean;
  column_order: number;
}

export const useDatasetTableData = (datasetId: string) => {
  const [indicators, setIndicators] = useState<DataIndicator[]>([]);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTableData = async () => {
      try {
        setLoading(true);
        
        // First get the resource for this dataset
        const { data: resources } = await supabase
          .from('catalog_resources')
          .select('id')
          .eq('dataset_id', datasetId)
          .eq('resource_type', 'TABLE')
          .limit(1);

        if (!resources || resources.length === 0) {
          setIndicators([]);
          setDataPoints([]);
          setColumns([]);
          setError('No TABLE resource found for this dataset. An admin needs to add table data first.');
          return;
        }

        const resourceId = resources[0].id;

        // Fetch indicators
        const { data: indicatorsData, error: indicatorsError } = await supabase
          .from('data_indicators')
          .select('*')
          .eq('resource_id', resourceId)
          .eq('is_active', true)
          .order('order_no');

        if (indicatorsError) throw indicatorsError;

        // Fetch data points
        const { data: dataPointsData, error: dataPointsError } = await supabase
          .from('data_points')
          .select('*')
          .eq('resource_id', resourceId)
          .order('period_start', { ascending: false });

        if (dataPointsError) throw dataPointsError;

        // Fetch table columns
        const { data: columnsData, error: columnsError } = await supabase
          .from('data_table_view_columns')
          .select('*')
          .eq('resource_id', resourceId)
          .eq('is_hidden', false)
          .order('column_order');

        if (columnsError) throw columnsError;

        setIndicators(indicatorsData || []);
        setDataPoints(dataPointsData || []);
        setColumns(columnsData || []);
        setError(null);

      } catch (err) {
        console.error('Error fetching table data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch table data');
      } finally {
        setLoading(false);
      }
    };

    if (datasetId) {
      fetchTableData();
    }
  }, [datasetId]);

  return {
    indicators,
    dataPoints,
    columns,
    loading,
    error
  };
};