import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { FileCheck, FileText, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface StatusData {
  name: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

export function DatasetStatusCard() {
  const { profile, orgRoles } = useAuth();
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDatasets, setTotalDatasets] = useState(0);

  const fetchDatasetStatus = async () => {
    try {
      // Use org roles instead of profile.role (removed for security)
      const isGlobalAdmin = orgRoles.some((role) => role.code === 'ADMIN');
      
      let query = supabase
        .from('catalog_metadata')
        .select('publication_status');
      
      // For non-admin users, filter by organization
      if (!isGlobalAdmin) {
        const { data: orgId, error: orgError } = await supabase.rpc('get_user_org_id');
        
        if (orgError) {
          console.error('Error getting user org_id:', orgError);
          throw orgError;
        }

        query = query.eq('publisher_org_id', orgId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Count datasets by status
      const statusCounts = {
        DRAFT: 0,
        PUBLISHED: 0,
        REVIEW: 0 // For "NEED REVIEW" status if it exists
      };

      data?.forEach(dataset => {
        const status = dataset.publication_status;
        if (status === 'DRAFT') {
          statusCounts.DRAFT++;
        } else if (status === 'PUBLISHED') {
          statusCounts.PUBLISHED++;
        } else {
          // Handle any other status as "NEED REVIEW"
          statusCounts.REVIEW++;
        }
      });

      const total = data?.length || 0;
      setTotalDatasets(total);

      const chartData: StatusData[] = [
        {
          name: 'Published',
          value: statusCounts.PUBLISHED,
          color: 'hsl(var(--primary))',
          icon: <Eye className="w-4 h-4" />
        },
        {
          name: 'Draft',
          value: statusCounts.DRAFT,
          color: 'hsl(var(--muted))',
          icon: <FileText className="w-4 h-4" />
        },
        {
          name: 'Need Review',
          value: statusCounts.REVIEW,
          color: 'hsl(var(--destructive))',
          icon: <FileCheck className="w-4 h-4" />
        }
      ].filter(item => item.value > 0); // Only show statuses that have datasets

      setStatusData(chartData);
    } catch (error) {
      console.error('Error fetching dataset status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasetStatus();
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalDatasets > 0 ? ((data.value / totalDatasets) * 100).toFixed(1) : 0;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            {data.icon}
            <span className="font-medium">{data.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.value} datasets ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dataset Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalDatasets === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dataset Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No datasets found</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          Dataset Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Pie Chart */}
          <div className="h-64 w-full lg:w-64 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status Legend and Stats */}
          <div className="flex-1 space-y-4">
            <div className="text-center lg:text-left">
              <div className="text-3xl font-bold text-primary">{totalDatasets}</div>
              <p className="text-sm text-muted-foreground">Total Datasets</p>
            </div>
            
            <div className="space-y-3">
              {statusData.map((status, index) => {
                const percentage = ((status.value / totalDatasets) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <div className="flex items-center gap-2">
                        {status.icon}
                        <span className="font-medium">{status.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{status.value}</div>
                      <div className="text-xs text-muted-foreground">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}