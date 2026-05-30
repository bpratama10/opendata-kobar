import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Plus, Trash2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  org_code: string | null;
  org_type: string;
  parent_id: string | null;
  category: string;
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
  const [newOrgCode, setNewOrgCode] = useState("");
  const [newOrgType, setNewOrgType] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [newOrgCategory, setNewOrgCategory] = useState<string>("Perangkat Daerah");
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

    if (newOrgCode.trim() && !/^[0-9]{2}$/.test(newOrgCode.trim())) {
      toast({
        title: "Validation Error",
        description: "Kode Organisasi harus berupa 2 digit angka (00-99)",
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
          org_code: newOrgCode.trim() || null,
          org_type: newOrgType as "WALIDATA" | "PRODUSEN_DATA" | "KOORDINATOR" | "LAINNYA",
          parent_id: selectedParentId === "none" ? null : selectedParentId || null,
          category: newOrgCategory,
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
      setNewOrgCode("");
      setNewOrgType("");
      setSelectedParentId("");
      setNewOrgCategory("Perangkat Daerah");

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
    if (org.org_code?.trim() && !/^[0-9]{2}$/.test(org.org_code.trim())) {
      toast({
        title: "Validation Error",
        description: "Kode Organisasi harus berupa 2 digit angka (00-99)",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('org_organizations')
        .update({
          name: org.name.trim(),
          short_name: org.short_name?.trim() || null,
          org_code: org.org_code?.trim() || null,
          org_type: org.org_type as "WALIDATA" | "PRODUSEN_DATA" | "KOORDINATOR" | "LAINNYA",
          parent_id: org.parent_id === "none" ? null : org.parent_id || null,
          category: org.category,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
              <Label htmlFor="org-code">Code</Label>
              <Input
                id="org-code"
                placeholder="e.g. 12"
                maxLength={2}
                value={newOrgCode}
                onChange={(e) => setNewOrgCode(e.target.value.replace(/[^0-9]/g, ''))}
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
              <Label htmlFor="org-category">Category *</Label>
              <Select value={newOrgCategory} onValueChange={setNewOrgCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Perangkat Daerah">Perangkat Daerah</SelectItem>
                  <SelectItem value="Perangkat Daerah Provinsi">Perangkat Daerah Provinsi</SelectItem>
                  <SelectItem value="Instansi Vertikal">Instansi Vertikal</SelectItem>
                  <SelectItem value="BUMN">BUMN</SelectItem>
                  <SelectItem value="BUMD">BUMD</SelectItem>
                  <SelectItem value="Lembaga Non-Struktural">Lembaga Non-Struktural</SelectItem>
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
                  <th className="text-left p-2">Category</th>
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
                          <div className="flex gap-2">
                            <Input
                              className="w-16 font-mono font-bold text-center"
                              maxLength={2}
                              placeholder="Code"
                              value={editingOrg.org_code || ""}
                              onChange={(e) => setEditingOrg({ ...editingOrg, org_code: e.target.value.replace(/[^0-9]/g, '') })}
                            />
                            <Input
                              value={editingOrg.name}
                              onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <Input
                            value={editingOrg.short_name || ""}
                            onChange={(e) => setEditingOrg({ ...editingOrg, short_name: e.target.value || null })}
                          />
                        </td>
                        <td className="p-2">
                          <Select
                            value={editingOrg.org_type}
                            onValueChange={(value) => setEditingOrg({ ...editingOrg, org_type: value })}
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
                            value={editingOrg.category || "Perangkat Daerah"}
                            onValueChange={(value) => setEditingOrg({ ...editingOrg, category: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih kategori" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Perangkat Daerah">Perangkat Daerah</SelectItem>
                              <SelectItem value="Instansi Vertikal">Instansi Vertikal</SelectItem>
                              <SelectItem value="BUMN">BUMN</SelectItem>
                              <SelectItem value="BUMD">BUMD</SelectItem>
                              <SelectItem value="Lembaga Non-Struktural">Lembaga Non-Struktural</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select
                            value={editingOrg.parent_id || "none"}
                            onValueChange={(value) => setEditingOrg({ ...editingOrg, parent_id: value === "none" ? null : value })}
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
                          <div className="flex items-center gap-2">
                             {org.org_code ? (
                               <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                                 {org.org_code}
                               </span>
                             ) : (
                               <span className="font-mono font-bold text-xs bg-slate-50 text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                 —
                               </span>
                             )}
                             <span className="font-medium">{org.name}</span>
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
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                            {org.category || "Perangkat Daerah"}
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