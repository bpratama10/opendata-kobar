import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TableColumn {
  id: string;
  resource_id: string;
  time_grain: 'YEAR' | 'QUARTER' | 'MONTH';
  period_start: string;
  column_label: string;
  is_hidden: boolean;
  column_order: number;
  created_at: string;
  updated_at: string;
}

export const usePeriods = (resourceId: string) => {
  const [periods, setPeriods] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPeriods = async () => {
    if (!resourceId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('data_table_view_columns')
        .select('*')
        .eq('resource_id', resourceId)
        .order('column_order');

      if (error) throw error;
      setPeriods(data || []);
    } catch (error) {
      console.error('Error fetching periods:', error);
      toast({
        title: "Error",
        description: "Failed to fetch periods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPeriod = async (period: Omit<TableColumn, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('data_table_view_columns')
        .insert([period])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Period created successfully",
      });
      
      fetchPeriods();
      return data;
    } catch (error) {
      console.error('Error creating period:', error);
      toast({
        title: "Error",
        description: "Failed to create period",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePeriod = async (id: string, updates: Partial<TableColumn>) => {
    try {
      const { error } = await supabase
        .from('data_table_view_columns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Period updated successfully",
      });
      
      fetchPeriods();
    } catch (error) {
      console.error('Error updating period:', error);
      toast({
        title: "Error",
        description: "Failed to update period",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePeriod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('data_table_view_columns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Period deleted successfully",
      });
      
      fetchPeriods();
    } catch (error) {
      console.error('Error deleting period:', error);
      toast({
        title: "Error",
        description: "Failed to delete period",
        variant: "destructive",
      });
      throw error;
    }
  };

  const reorderPeriods = async (periodIds: string[]) => {
    try {
      const updates = periodIds.map((id, index) => ({
        id,
        column_order: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('data_table_view_columns')
          .update({ column_order: update.column_order })
          .eq('id', update.id);
      }

      fetchPeriods();
    } catch (error) {
      console.error('Error reordering periods:', error);
      toast({
        title: "Error",
        description: "Failed to reorder periods",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [resourceId]);

  return {
    periods,
    loading,
    createPeriod,
    updatePeriod,
    deletePeriod,
    reorderPeriods,
    refetch: fetchPeriods,
  };
};