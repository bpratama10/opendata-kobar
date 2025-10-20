import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building, Eye, Edit, Plus, Trash2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  org_type: string;
  parent_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function OrganizationManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgShortName, setNewOrgShortName] = useState("");
  const [newOrgType, setNewOrgType] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const { toast } = useToast();

  const orgTypes = [
    { value: "WALIDATA", label: "Walidata" },
    { value: "PRODUSEN_DATA", label: "Produsen Data" },
    { value: "KOORDINATOR", label: "Koordinator" },
    { value: "LAINNYA", label: "Lainnya" }
  ];

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('org_organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organizations:', error);
        toast({
          title: "Error",
          description: "Failed to fetch organizations",
          variant: "destructive",
        });
        return;
      }

      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch organizations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName.trim() || !newOrgType) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Name and Type)",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('org_organizations')
        .insert({
          name: newOrgName.trim(),
          short_name: newOrgShortName.trim() || null,
          org_type: newOrgType as "WALIDATA" | "PRODUSEN_DATA" | "KOORDINATOR" | "LAINNYA",
          parent_id: selectedParentId === "none" ? null : selectedParentId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating organization:', error);
        toast({
          title: "Error",
          description: "Failed to create organization",
          variant: "destructive",
        });
        return;
      }

      setOrganizations([data, ...organizations]);
      setNewOrgName("");
      setNewOrgShortName("");
      setNewOrgType("");
      setSelectedParentId("");
      
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      });
    }
  };

  const updateOrganization = async (org: Organization) => {
    try {
      const { error } = await supabase
        .from('org_organizations')
        .update({
          name: org.name.trim(),
          short_name: org.short_name?.trim() || null,
          org_type: org.org_type as "WALIDATA" | "PRODUSEN_DATA" | "KOORDINATOR" | "LAINNYA",
          parent_id: org.parent_id === "none" ? null : org.parent_id || null,
        })
        .eq('id', org.id);

      if (error) {
        console.error('Error updating organization:', error);
        toast({
          title: "Error", 
          description: "Failed to update organization",
          variant: "destructive",
        });
        return;
      }

      setOrganizations(organizations.map(o => 
        o.id === org.id ? { ...org, updated_at: new Date().toISOString() } : o
      ));
      setEditingOrg(null);
      
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Error",
        description: "Failed to update organization", 
        variant: "destructive",
      });
    }
  };

  const deleteOrganization = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('org_organizations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting organization:', error);
        toast({
          title: "Error",
          description: "Failed to delete organization",
          variant: "destructive",
        });
        return;
      }

      setOrganizations(organizations.filter(org => org.id !== id));
      
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error",
        description: "Failed to delete organization",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.short_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rootOrganizations = organizations.filter(org => org.parent_id === null);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading organizations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Organization Management</h1>
          <p className="text-muted-foreground">Manage organizations and their hierarchies</p>
        </div>
      </div>

      {/* Add Organization Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="org-name">Name *</Label>
              <Input
                id="org-name"
                placeholder="Enter organization name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="org-short-name">Short Name</Label>
              <Input
                id="org-short-name"
                placeholder="Enter short name"
                value={newOrgShortName}
                onChange={(e) => setNewOrgShortName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="org-type">Type *</Label>
              <Select value={newOrgType} onValueChange={setNewOrgType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization type" />
                </SelectTrigger>
                <SelectContent>
                  {orgTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="parent-org">Parent Organization</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Organization)</SelectItem>
                  {rootOrganizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={createOrganization}>
              <Plus className="w-4 h-4 mr-2" />
              Add Organization
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{organizations.length}</div>
            <div className="text-sm text-muted-foreground">Total Organizations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {organizations.filter(o => o.org_type === 'WALIDATA').length}
            </div>
            <div className="text-sm text-muted-foreground">Walidata</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {rootOrganizations.length}
            </div>
            <div className="text-sm text-muted-foreground">Root Organizations</div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <Input
            placeholder="Search organizations..."
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
                  <th className="text-left p-2">Short Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Parent</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrganizations.map((org) => (
                  <tr key={org.id} className="border-b hover:bg-muted/50">
                    {editingOrg?.id === org.id ? (
                      <>
                        <td className="p-2">
                          <Input
                            value={editingOrg.name}
                            onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={editingOrg.short_name || ""}
                            onChange={(e) => setEditingOrg({...editingOrg, short_name: e.target.value || null})}
                          />
                        </td>
                        <td className="p-2">
                          <Select 
                            value={editingOrg.org_type} 
                            onValueChange={(value) => setEditingOrg({...editingOrg, org_type: value})}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {orgTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select 
                            value={editingOrg.parent_id || "none"} 
                            onValueChange={(value) => setEditingOrg({...editingOrg, parent_id: value === "none" ? null : value})}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {rootOrganizations.filter(o => o.id !== org.id).map((parent) => (
                                <SelectItem key={parent.id} value={parent.id}>
                                  {parent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateOrganization(editingOrg)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingOrg(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2" />
                            {org.name}
                          </div>
                        </td>
                        <td className="p-2">
                          {org.short_name || "—"}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline">
                            {orgTypes.find(t => t.value === org.org_type)?.label || org.org_type}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {org.parent_id ? 
                            organizations.find(p => p.id === org.parent_id)?.name || "Unknown" 
                            : "—"
                          }
                        </td>
                        <td className="p-2">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingOrg(org)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteOrganization(org.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredOrganizations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No organizations found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}