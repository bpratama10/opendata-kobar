import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Eye, Edit, Plus } from "lucide-react";

interface Resource {
  id: string;
  name: string;
  description: string | null;
  resource_type: string;
  dataset_id: string;
  created_at: string;
  updated_at: string;
  schema_json: any;
}

export function ResourceManagement() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching resources:', error);
        return;
      }

      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const filteredResources = resources.filter(resource =>
    resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading resources...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Resource Management</h1>
          <p className="text-muted-foreground">Manage dataset resources and their metadata</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{resources.length}</div>
            <div className="text-sm text-muted-foreground">Total Resources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {resources.filter(r => r.resource_type === 'data').length}
            </div>
            <div className="text-sm text-muted-foreground">Data Resources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {resources.filter(r => r.resource_type === 'documentation').length}
            </div>
            <div className="text-sm text-muted-foreground">Documentation</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <Input
            placeholder="Search resources..."
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
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resource) => (
                  <tr key={resource.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        {resource.name}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {resource.resource_type}
                      </Badge>
                    </td>
                    <td className="p-2 max-w-xs truncate">
                      {resource.description || "No description"}
                    </td>
                    <td className="p-2">
                      {new Date(resource.created_at).toLocaleDateString()}
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
          {filteredResources.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No resources found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}