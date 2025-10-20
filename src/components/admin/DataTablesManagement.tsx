import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IndicatorsManager } from "./dataTables/IndicatorsManager";
import { PeriodsManager } from "./dataTables/PeriodsManager";
import { DataEntryGrid } from "./dataTables/DataEntryGrid";

interface Dataset {
  id: string;
  title: string;
}

interface Resource {
  id: string;
  name: string;
  resource_type: string;
}

export function DataTablesManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDatasetAndResource = async () => {
      if (!id) return;

      try {
        // Fetch dataset info
        const { data: datasetData, error: datasetError } = await supabase
          .from('catalog_metadata')
          .select('id, title')
          .eq('id', id)
          .single();

        if (datasetError) throw datasetError;
        setDataset(datasetData);

        // Fetch or create TABLE resource
        let { data: resources, error: resourceError } = await supabase
          .from('catalog_resources')
          .select('*')
          .eq('dataset_id', id)
          .eq('resource_type', 'TABLE');

        if (resourceError) throw resourceError;

        let tableResource = resources?.[0];

        // Create TABLE resource if it doesn't exist
        if (!tableResource) {
          const { data: newResource, error: createError } = await supabase
            .from('catalog_resources')
            .insert([{
              dataset_id: id,
              name: `${datasetData.title} - Data Table`,
              resource_type: 'TABLE',
              description: 'Data table for structured indicators and time series data'
            }])
            .select()
            .single();

          if (createError) throw createError;
          tableResource = newResource;

          toast({
            title: "Success",
            description: "Data table resource created successfully",
          });
        }

        setResource(tableResource);
      } catch (error) {
        console.error('Error fetching dataset and resource:', error);
        toast({
          title: "Error",
          description: "Failed to load dataset information",
          variant: "destructive",
        });
        navigate('/admin/datasets');
      } finally {
        setLoading(false);
      }
    };

    fetchDatasetAndResource();
  }, [id, navigate, toast]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading dataset information...</div>;
  }

  if (!dataset || !resource) {
    return <div className="flex items-center justify-center p-8">Dataset not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin/datasets')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Data Tables Management</h1>
            <p className="text-muted-foreground">{dataset.title}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Dataset Tables</CardTitle>
          <CardDescription>
            Create and manage structured data tables with indicators, time periods, and data points.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="indicators" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="indicators">Indicators (Rows)</TabsTrigger>
              <TabsTrigger value="periods">Periods (Columns)</TabsTrigger>
              <TabsTrigger value="data">Data Entry</TabsTrigger>
            </TabsList>
            
            <TabsContent value="indicators" className="mt-6">
              <IndicatorsManager resourceId={resource.id} />
            </TabsContent>
            
            <TabsContent value="periods" className="mt-6">
              <PeriodsManager resourceId={resource.id} />
            </TabsContent>
            
            <TabsContent value="data" className="mt-6">
              <DataEntryGrid resourceId={resource.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}