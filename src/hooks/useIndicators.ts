import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DataIndicator {
  id: string;
  resource_id: string;
  code: string;
  label: string;
  unit?: string;
  description?: string;
  order_no: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useIndicators = (resourceId: string) => {
  const [indicators, setIndicators] = useState<DataIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchIndicators = async () => {
    if (!resourceId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('data_indicators')
        .select('*')
        .eq('resource_id', resourceId)
        .order('order_no');

      if (error) throw error;
      setIndicators(data || []);
    } catch (error) {
      console.error('Error fetching indicators:', error);
      toast({
        title: "Error",
        description: "Failed to fetch indicators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createIndicator = async (indicator: Omit<DataIndicator, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('data_indicators')
        .insert([indicator])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Indicator created successfully",
      });
      
      fetchIndicators();
      return data;
    } catch (error) {
      console.error('Error creating indicator:', error);
      toast({
        title: "Error",
        description: "Failed to create indicator",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateIndicator = async (id: string, updates: Partial<DataIndicator>) => {
    try {
      const { error } = await supabase
        .from('data_indicators')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Indicator updated successfully",
      });
      
      fetchIndicators();
    } catch (error) {
      console.error('Error updating indicator:', error);
      toast({
        title: "Error",
        description: "Failed to update indicator",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteIndicator = async (id: string) => {
    try {
      const { error } = await supabase
        .from('data_indicators')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Indicator deleted successfully",
      });
      
      fetchIndicators();
    } catch (error) {
      console.error('Error deleting indicator:', error);
      toast({
        title: "Error",
        description: "Failed to delete indicator",
        variant: "destructive",
      });
      throw error;
    }
  };

  const reorderIndicators = async (indicatorIds: string[]) => {
    try {
      const updates = indicatorIds.map((id, index) => ({
        id,
        order_no: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('data_indicators')
          .update({ order_no: update.order_no })
          .eq('id', update.id);
      }

      fetchIndicators();
    } catch (error) {
      console.error('Error reordering indicators:', error);
      toast({
        title: "Error",
        description: "Failed to reorder indicators",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchIndicators();
  }, [resourceId]);

  return {
    indicators,
    loading,
    createIndicator,
    updateIndicator,
    deleteIndicator,
    reorderIndicators,
    refetch: fetchIndicators,
  };
};