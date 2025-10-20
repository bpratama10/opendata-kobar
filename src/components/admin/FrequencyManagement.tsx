import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Eye, Edit, Plus } from "lucide-react";

interface UpdateFrequency {
  code: string;
  name: string;
  notes: string | null;
}

export function FrequencyManagement() {
  const [frequencies, setFrequencies] = useState<UpdateFrequency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchFrequencies = async () => {
    try {
      const { data, error } = await supabase
        .from('freq_upd')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching update frequencies:', error);
        return;
      }

      setFrequencies(data || []);
    } catch (error) {
      console.error('Error fetching update frequencies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrequencies();
  }, []);

  const filteredFrequencies = frequencies.filter(frequency =>
    frequency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    frequency.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading update frequencies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Update Frequency Management</h1>
          <p className="text-muted-foreground">Manage dataset update frequencies and schedules</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Frequency
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{frequencies.length}</div>
            <div className="text-sm text-muted-foreground">Total Frequencies</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {frequencies.filter(f => f.code.toLowerCase().includes('daily')).length}
            </div>
            <div className="text-sm text-muted-foreground">Daily Updates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {frequencies.filter(f => f.code.toLowerCase().includes('monthly')).length}
            </div>
            <div className="text-sm text-muted-foreground">Monthly Updates</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update Frequencies</CardTitle>
          <Input
            placeholder="Search frequencies..."
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
                {filteredFrequencies.map((frequency) => (
                  <tr key={frequency.code} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Badge variant="outline">
                        {frequency.code}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {frequency.name}
                      </div>
                    </td>
                    <td className="p-2 max-w-xs truncate">
                      {frequency.notes || "No notes"}
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
          {filteredFrequencies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No update frequencies found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}