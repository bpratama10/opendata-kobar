import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Eye, Edit, Plus } from "lucide-react";

interface Role {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('org_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading roles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{roles.length}</div>
            <div className="text-sm text-muted-foreground">Total Roles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {roles.filter(r => r.code.includes('admin')).length}
            </div>
            <div className="text-sm text-muted-foreground">Admin Roles</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <Input
            placeholder="Search roles..."
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
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        {role.name}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {role.code}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {new Date(role.created_at).toLocaleDateString()}
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
          {filteredRoles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No roles found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}