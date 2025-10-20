import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Eye, Edit, Plus, ExternalLink } from "lucide-react";

interface License {
  code: string;
  name: string;
  url: string | null;
  notes: string | null;
}

export function LicenseManagement() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('lisensi')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching licenses:', error);
        return;
      }

      setLicenses(data || []);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const filteredLicenses = licenses.filter(license =>
    license.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading licenses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">License Management</h1>
          <p className="text-muted-foreground">Manage data licenses and usage terms</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add License
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{licenses.length}</div>
            <div className="text-sm text-muted-foreground">Total Licenses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {licenses.filter(l => l.url).length}
            </div>
            <div className="text-sm text-muted-foreground">With URL</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {licenses.filter(l => l.code.toLowerCase().includes('open')).length}
            </div>
            <div className="text-sm text-muted-foreground">Open Licenses</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Licenses</CardTitle>
          <Input
            placeholder="Search licenses..."
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
                  <th className="text-left p-2">URL</th>
                  <th className="text-left p-2">Notes</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.map((license) => (
                  <tr key={license.code} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Badge variant="outline">
                        {license.code}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        {license.name}
                      </div>
                    </td>
                    <td className="p-2">
                      {license.url ? (
                        <a 
                          href={license.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-primary hover:underline"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2 max-w-xs truncate">
                      {license.notes || "No notes"}
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
          {filteredLicenses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No licenses found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}