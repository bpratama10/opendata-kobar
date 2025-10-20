import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, Eye, Edit, Plus } from "lucide-react";

interface Classification {
  code: string;
  name: string;
  notes: string | null;
}

export function ClassificationManagement() {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClassifications = async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_data_classifications')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching classifications:', error);
        return;
      }

      setClassifications(data || []);
    } catch (error) {
      console.error('Error fetching classifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassifications();
  }, []);

  const filteredClassifications = classifications.filter(classification =>
    classification.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classification.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading classifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Classification Management</h1>
          <p className="text-muted-foreground">Manage data classification levels and security</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Classification
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{classifications.length}</div>
            <div className="text-sm text-muted-foreground">Total Classifications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {classifications.filter(c => c.code === 'PUBLIC').length}
            </div>
            <div className="text-sm text-muted-foreground">Public</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {classifications.filter(c => c.code !== 'PUBLIC').length}
            </div>
            <div className="text-sm text-muted-foreground">Restricted</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classifications</CardTitle>
          <Input
            placeholder="Search classifications..."
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
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Notes</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassifications.map((classification) => (
                  <tr key={classification.code} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Badge variant={classification.code === 'PUBLIC' ? 'default' : 'secondary'}>
                        {classification.code}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <Scale className="w-4 h-4 mr-2" />
                        {classification.name}
                      </div>
                    </td>
                    <td className="p-2 max-w-xs truncate">
                      {classification.notes || "No notes"}
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
          {filteredClassifications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No classifications found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}