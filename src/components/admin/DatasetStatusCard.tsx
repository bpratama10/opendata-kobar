import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { FileCheck, FileText, Eye, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";

interface StatusData {
  name: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

export function DatasetStatusCard() {
  const { orgRoles } = useAuth();
  const { permissions } = useRoleAccess();
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [priorityData, setPriorityData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDatasets, setTotalDatasets] = useState(0);
  const [totalPriority, setTotalPriority] = useState(0);

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
        REVIEW: 0
      };

      data?.forEach(dataset => {
        const status = dataset.publication_status;
        if (status === 'DRAFT') {
          statusCounts.DRAFT++;
        } else if (status === 'PUBLISHED') {
          statusCounts.PUBLISHED++;
        } else {
          statusCounts.REVIEW++;
        }
      });

      const total = data?.length || 0;
      setTotalDatasets(total);

      const chartData: StatusData[] = [
        {
          name: 'Published',
          value: statusCounts.PUBLISHED,
          color: 'hsl(142, 76%, 36%)',
          icon: <Eye className="w-4 h-4" />
        },
        {
          name: 'Draft',
          value: statusCounts.DRAFT,
          color: 'hsl(215, 20%, 65%)',
          icon: <FileText className="w-4 h-4" />
        },
        {
          name: 'Need Review',
          value: statusCounts.REVIEW,
          color: 'hsl(0, 84%, 60%)',
          icon: <FileCheck className="w-4 h-4" />
        }
      ].filter(item => item.value > 0);

      setStatusData(chartData);
    } catch (error) {
      console.error('Error fetching dataset status:', error);
    }
  };

  const fetchPriorityDataStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('priority_datasets')
        .select('status, id');

      if (error) throw error;

      // Get converted count from catalog_metadata
      const { data: convertedData } = await supabase
        .from('catalog_metadata')
        .select('priority_dataset_id, publication_status')
        .not('priority_dataset_id', 'is', null);

      const convertedIds = new Set(convertedData?.map(d => d.priority_dataset_id) || []);
      const publishedIds = new Set(
        convertedData?.filter(d => d.publication_status === 'PUBLISHED')
          .map(d => d.priority_dataset_id) || []
      );

      const statusCounts = {
        UNASSIGNED: 0,
        ASSIGNED_CLAIMED: 0,
        PUBLISHED: 0
      };

      data?.forEach(dataset => {
        if (publishedIds.has(dataset.id)) {
          statusCounts.PUBLISHED++;
        } else if (dataset.status === 'unassigned') {
          statusCounts.UNASSIGNED++;
        } else {
          // assigned or claimed but not yet published
          statusCounts.ASSIGNED_CLAIMED++;
        }
      });

      const total = data?.length || 0;
      setTotalPriority(total);

      const chartData: StatusData[] = [
        {
          name: 'Published',
          value: statusCounts.PUBLISHED,
          color: 'hsl(142, 76%, 36%)',
          icon: <CheckCircle className="w-4 h-4" />
        },
        {
          name: 'Assigned/Claimed',
          value: statusCounts.ASSIGNED_CLAIMED,
          color: 'hsl(45, 93%, 47%)',
          icon: <Shield className="w-4 h-4" />
        },
        {
          name: 'Unassigned',
          value: statusCounts.UNASSIGNED,
          color: 'hsl(215, 20%, 65%)',
          icon: <AlertCircle className="w-4 h-4" />
        }
      ].filter(item => item.value > 0);

      setPriorityData(chartData);
    } catch (error) {
      console.error('Error fetching priority data status:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchDatasetStatus();
      if (permissions.canViewPriorityData) {
        await fetchPriorityDataStatus();
      }
      setLoading(false);
    };
    fetchData();
  }, [permissions.canViewPriorityData]);

  const CustomTooltip = ({ active, payload, total }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
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
      <div className="grid gap-6 md:grid-cols-2">
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
        {permissions.canViewPriorityData && (
          <Card>
            <CardHeader>
              <CardTitle>Priority Data Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Regular Dataset Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Dataset Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalDatasets === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No datasets found</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Pie Chart */}
              <div className="h-64 w-full max-w-xs">
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
                    <Tooltip content={<CustomTooltip total={totalDatasets} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Legend and Stats */}
              <div className="w-full space-y-4">
                <div className="text-center">
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
                            <span className="font-medium text-sm">{status.name}</span>
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
          )}
        </CardContent>
      </Card>

      {/* Priority Data Status Chart - Only for ADMIN/KOORDINATOR/WALIDATA */}
      {permissions.canViewPriorityData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Priority Data Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPriority === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No priority datasets found</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                {/* Pie Chart */}
                <div className="h-64 w-full max-w-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip total={totalPriority} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Status Legend and Stats */}
                <div className="w-full space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-500">{totalPriority}</div>
                    <p className="text-sm text-muted-foreground">Total Priority Datasets</p>
                  </div>
                  
                  <div className="space-y-3">
                    {priorityData.map((status, index) => {
                      const percentage = ((status.value / totalPriority) * 100).toFixed(1);
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: status.color }}
                            />
                            <div className="flex items-center gap-2">
                              {status.icon}
                              <span className="font-medium text-sm">{status.name}</span>
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
