import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Download, Eye, Calendar, TrendingUp } from "lucide-react";

interface DownloadAnalytics {
  id: number;
  distribution_id: string;
  user_id: string | null;
  channel: string;
  client_info: any;
  created_at: string;
}

export function AnalyticsManagement() {
  const [downloads, setDownloads] = useState<DownloadAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDownloads = async () => {
    try {
      const { data, error } = await supabase
        .from('telemetry_downloads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent downloads

      if (error) {
        console.error('Error fetching downloads:', error);
        return;
      }

      setDownloads(data || []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, []);

  const filteredDownloads = downloads.filter(download =>
    download.channel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate analytics
  const totalDownloads = downloads.length;
  const uniqueUsers = new Set(downloads.filter(d => d.user_id).map(d => d.user_id)).size;
  const todayDownloads = downloads.filter(d => 
    new Date(d.created_at).toDateString() === new Date().toDateString()
  ).length;
  const channelStats = downloads.reduce((acc, d) => {
    acc[d.channel] = (acc[d.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor downloads and usage statistics</p>
        </div>
        <Button>
          <BarChart3 className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{totalDownloads}</div>
                <div className="text-sm text-muted-foreground">Total Downloads</div>
              </div>
              <Download className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{uniqueUsers}</div>
                <div className="text-sm text-muted-foreground">Unique Users</div>
              </div>
              <Eye className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{todayDownloads}</div>
                <div className="text-sm text-muted-foreground">Today's Downloads</div>
              </div>
              <Calendar className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{Object.keys(channelStats).length}</div>
                <div className="text-sm text-muted-foreground">Active Channels</div>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Download Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(channelStats).map(([channel, count]) => (
                <div key={channel} className="flex justify-between items-center">
                  <Badge variant="outline">{channel}</Badge>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Downloads</CardTitle>
            <Input
              placeholder="Search downloads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Channel</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">User</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDownloads.slice(0, 10).map((download) => (
                    <tr key={download.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Badge variant="outline">
                          {download.channel}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {new Date(download.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        {download.user_id ? "Authenticated" : "Anonymous"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredDownloads.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No downloads found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}