import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Eye, Edit, Plus } from "lucide-react";

interface Distribution {
  id: string;
  resource_id: string;
  version: string;
  media_type: string;
  byte_size: number | null;
  availability: string;
  storage_uri: string | null;
  created_at: string;
  checksum_sha256: string | null;
}

export function DistributionManagement() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDistributions = async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_distributions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching distributions:', error);
        return;
      }

      setDistributions(data || []);
    } catch (error) {
      console.error('Error fetching distributions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributions();
  }, []);

  const filteredDistributions = distributions.filter(distribution =>
    distribution.media_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distribution.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading distributions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Distribution Management</h1>
          <p className="text-muted-foreground">Manage file distributions and formats</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Distribution
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{distributions.length}</div>
            <div className="text-sm text-muted-foreground">Total Distributions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {distributions.filter(d => d.availability === 'online').length}
            </div>
            <div className="text-sm text-muted-foreground">Online</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(distributions.map(d => d.media_type)).size}
            </div>
            <div className="text-sm text-muted-foreground">File Types</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {formatFileSize(distributions.reduce((sum, d) => sum + (d.byte_size || 0), 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total Size</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distributions</CardTitle>
          <Input
            placeholder="Search distributions..."
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
                  <th className="text-left p-2">Media Type</th>
                  <th className="text-left p-2">Version</th>
                  <th className="text-left p-2">Size</th>
                  <th className="text-left p-2">Availability</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistributions.map((distribution) => (
                  <tr key={distribution.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center">
                        <Download className="w-4 h-4 mr-2" />
                        {distribution.media_type}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {distribution.version}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {formatFileSize(distribution.byte_size)}
                    </td>
                    <td className="p-2">
                      <Badge variant={distribution.availability === 'online' ? 'default' : 'secondary'}>
                        {distribution.availability}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {new Date(distribution.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredDistributions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No distributions found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}