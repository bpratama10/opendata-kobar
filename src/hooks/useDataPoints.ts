import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DataPoint {
  id: string;
  indicator_id: string;
  resource_id: string;
  time_grain: 'YEAR' | 'QUARTER' | 'MONTH';
  period_start: string;
  period_label: string;
  value?: number;
  qualifier: 'NA' | 'OFFICIAL' | 'PRELIM' | 'EST';
  distribution_id?: string;
  created_at: string;
  updated_at: string;
}

export const useDataPoints = (resourceId: string) => {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDataPoints = async () => {
    if (!resourceId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('data_points')
        .select('*')
        .eq('resource_id', resourceId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      setDataPoints(data || []);
    } catch (error) {
      console.error('Error fetching data points:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data points",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const upsertDataPoint = async (dataPoint: Omit<DataPoint, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('data_points')
        .upsert([dataPoint], {
          onConflict: 'indicator_id,period_start,resource_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      
      fetchDataPoints();
      return data;
    } catch (error) {
      console.error('Error upserting data point:', error);
      toast({
        title: "Error",
        description: "Failed to save data point",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteDataPoint = async (id: string) => {
    try {
      const { error } = await supabase
        .from('data_points')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Data point deleted successfully",
      });
      
      fetchDataPoints();
    } catch (error) {
      console.error('Error deleting data point:', error);
      toast({
        title: "Error",
        description: "Failed to delete data point",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getDataPointValue = (indicatorId: string, periodStart: string): DataPoint | undefined => {
    return dataPoints.find(dp => 
      dp.indicator_id === indicatorId && dp.period_start === periodStart
    );
  };

  const bulkUpsertDataPoints = async (dataPointsToUpsert: Omit<DataPoint, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const { error } = await supabase
        .from('data_points')
        .upsert(dataPointsToUpsert, {
          onConflict: 'indicator_id,period_start,resource_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Data points saved successfully",
      });
      
      fetchDataPoints();
    } catch (error) {
      console.error('Error bulk upserting data points:', error);
      toast({
        title: "Error",
        description: "Failed to save data points",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchDataPoints();
  }, [resourceId]);

  return {
    dataPoints,
    loading,
    upsertDataPoint,
    deleteDataPoint,
    getDataPointValue,
    bulkUpsertDataPoints,
    refetch: fetchDataPoints,
  };
};