import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Edit, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";

export type PriorityDataset = {
  id: string;
  code: string;
  name: string;
  operational_definition: string;
  producing_agency: string;
  source_reference: string;
  update_schedule: string;
  status: string;
  updated_at: string;
  assigned_org: string | null;
  assigned_org_data?: { name: string, short_name: string } | null;
  is_converted?: boolean;
  data_type?: string;
  proposing_agency?: string;
};

const fetchPriorityDatasets = async (): Promise<PriorityDataset[]> => {
  const { data, error } = await supabase
    .from("priority_datasets")
    .select(`*, assigned_org_data:org_organizations!assigned_org(name, short_name)`)
    .order("code", { ascending: true });

  if (error) throw new Error(error.message);

  if (data) {
    const priorityIds = data.map((d) => d.id);
    const { data: convertedData } = await supabase
      .from("catalog_metadata")
      .select("priority_dataset_id")
      .in("priority_dataset_id", priorityIds)
      .not("priority_dataset_id", "is", null);

    const convertedSet = new Set(convertedData?.map((c) => c.priority_dataset_id) || []);

    return data.map((dataset) => ({
      ...dataset,
      is_converted: convertedSet.has(dataset.id),
    })) as PriorityDataset[];
  }

  return [];
};

const formatCode = (val: string) => {
  const digits = val.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
};

export default function PriorityData() {
  const { permissions, isAdmin } = useRoleAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [createEditDialogOpen, setCreateEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<PriorityDataset | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const itemsPerPage = 10;

  const { data: datasets = [], isLoading, error } = useQuery({
    queryKey: ["priority-datasets"],
    queryFn: fetchPriorityDatasets,
  });

  const convertMutation = useMutation({
    mutationFn: async (dataset: PriorityDataset) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc('fn_convert_priority_to_dataset', {
        p_priority_dataset_id: dataset.id,
        p_assignee_org_id: dataset.assigned_org || null,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
      toast({ title: "Success", description: "Priority dataset converted to catalog dataset" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to convert dataset", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from('priority_datasets').update({
        status: 'unassigned',
        assigned_org: null,
        assigned_by: null,
        assigned_at: null,
        claimed_by: null,
        claimed_at: null
      }).eq('id', datasetId);
      if (error) throw error;

      await supabase.from('priority_dataset_logs').insert({
        priority_dataset_id: datasetId,
        action: 'unassign',
        actor_id: user.id,
        notes: 'Dataset reset to unassigned status'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
      setResetDialogOpen(false);
      setSelectedDataset(null);
      toast({ title: "Success", description: "Dataset reset successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to reset dataset", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newDataset: Omit<PriorityDataset, "id" | "updated_at" | "status">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("priority_datasets")
        .insert({
          ...newDataset,
          status: "unassigned"
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("priority_dataset_logs").insert({
        priority_dataset_id: data.id,
        action: "update",
        actor_id: user.id,
        notes: "Priority dataset created"
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
      toast({ title: "Success", description: "Priority dataset created successfully" });
      setCreateEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create dataset", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PriorityDataset> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("priority_datasets")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("priority_dataset_logs").insert({
        priority_dataset_id: id,
        action: "update",
        actor_id: user.id,
        notes: "Priority dataset updated"
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
      toast({ title: "Success", description: "Priority dataset updated successfully" });
      setCreateEditDialogOpen(false);
      setSelectedDataset(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update dataset", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Verify the user is an Administrator before deleting referenced values and the dataset
      if (!isAdmin) {
        throw new Error("Hanya Administrator yang diperbolehkan menghapus data prioritas.");
      }

      // 1. Fetch any converted catalog dataset associated with this priority dataset
      const { data: catalogData, error: catalogFetchError } = await supabase
        .from("catalog_metadata")
        .select("id")
        .eq("priority_dataset_id", id);

      if (catalogFetchError) throw catalogFetchError;

      const catalogIds = catalogData?.map(c => c.id) || [];

      if (catalogIds.length > 0) {
        // 2a. Delete from catalog_dataset_themes
        const { error: themesErr } = await supabase
          .from("catalog_dataset_themes")
          .delete()
          .in("dataset_id", catalogIds);
        if (themesErr) throw themesErr;

        // 2b. Delete from catalog_resources
        const { error: resourcesErr } = await supabase
          .from("catalog_resources")
          .delete()
          .in("dataset_id", catalogIds);
        if (resourcesErr) throw resourcesErr;

        // 2c. Delete from catalog_metadata
        const { error: metadataErr } = await supabase
          .from("catalog_metadata")
          .delete()
          .in("id", catalogIds);
        if (metadataErr) throw metadataErr;
      }

      // 3. Delete from priority_dataset_logs
      const { error: logsErr } = await supabase
        .from("priority_dataset_logs")
        .delete()
        .eq("priority_dataset_id", id);
      if (logsErr) throw logsErr;

      // 4. Finally, delete from priority_datasets
      const { error: priorityErr } = await supabase
        .from("priority_datasets")
        .delete()
        .eq("id", id);

      if (priorityErr) throw priorityErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
      toast({ title: "Success", description: "Priority dataset and its referenced values deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedDataset(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete dataset", variant: "destructive" });
    }
  });

  const handleOpenCreateDialog = () => {
    setSelectedDataset(null);
    setCreateEditDialogOpen(true);
  };

  const handleOpenEditDialog = (dataset: PriorityDataset) => {
    setSelectedDataset(dataset);
    setCreateEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (dataset: PriorityDataset) => {
    setSelectedDataset(dataset);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    if (!permissions.canViewPriorityData) {
      navigate('/admin/datasets');
    }
  }, [permissions.canViewPriorityData, navigate]);

  const handleOpenAssignDialog = (dataset: PriorityDataset) => {
    setSelectedDataset(dataset);
    setAssignDialogOpen(true);
  };

  const handleOpenResetDialog = (dataset: PriorityDataset) => {
    setSelectedDataset(dataset);
    setResetDialogOpen(true);
  };

  if (!permissions.canViewPriorityData) {
    return null;
  }

  // Calculate counts for filter cards
  const unassignedCount = datasets.filter(d => d.status === 'unassigned').length;
  const assignedCount = datasets.filter(d => d.status === 'assigned' || d.status === 'claimed').length;
  const assignedNotConvertedCount = datasets.filter(d =>
    (d.status === 'assigned' || d.status === 'claimed') && !d.is_converted
  ).length;

  // Get the most assigned organization
  const orgCounts = datasets
    .filter(d => d.assigned_org && (d.status === 'assigned' || d.status === 'claimed'))
    .reduce((acc, d) => {
      const orgName = d.assigned_org_data?.short_name || d.assigned_org_data?.name || 'Unknown';
      acc[orgName] = (acc[orgName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const mostAssignedOrg = Object.entries(orgCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

  const filteredDatasets = datasets.filter(dataset => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = dataset.name.toLowerCase().includes(term) ||
      (dataset.operational_definition && dataset.operational_definition.toLowerCase().includes(term));

    let matchesStatus = true;
    if (statusFilter) {
      if (statusFilter === 'assigned') {
        matchesStatus = dataset.status === 'assigned' || dataset.status === 'claimed';
      } else if (statusFilter === 'assigned-not-converted') {
        matchesStatus = (dataset.status === 'assigned' || dataset.status === 'claimed') && !dataset.is_converted;
      } else {
        matchesStatus = dataset.status === statusFilter;
      }
    }

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const paginatedDatasets = filteredDatasets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    const pageNumbers = [];
    const pageRangeDisplayed = 5;

    let startPage = currentPage;
    const endPage = Math.min(totalPages, currentPage + pageRangeDisplayed - 1);

    if (endPage - startPage + 1 < pageRangeDisplayed && startPage > 1) {
      startPage = Math.max(1, endPage - pageRangeDisplayed + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button variant="ghost" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</Button>
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
          </PaginationItem>
          {startPage > 1 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          {pageNumbers.map(number => (
            <PaginationItem key={number}>
              <PaginationLink href="#" isActive={number === currentPage} onClick={(e) => { e.preventDefault(); handlePageChange(number); }}>
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}
          {endPage < totalPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} />
          </PaginationItem>
          <PaginationItem>
            <Button variant="ghost" size="sm" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>Last</Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Data Prioritas (Pusat)</h2>
            <p className="text-muted-foreground">
              Daftar dataset yang menjadi prioritas untuk dipenuhi.
            </p>
          </div>
          {permissions.isWalidataReadOnly ? (
            <Badge variant="secondary">View Only</Badge>
          ) : (
            permissions.canManagePriorityData && (
              <Button onClick={handleOpenCreateDialog} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all duration-200">
                <Plus className="w-4 h-4" />
                Tambah Data Prioritas
              </Button>
            )
          )}
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Jumlah Data Prioritas ({datasets.length})</CardTitle>
                <CardDescription>
                  Daftar dataset yang menjadi prioritas untuk dipenuhi.
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4" />
                <Input
                  placeholder="Cari berdasarkan judul atau deskripsi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                className={`cursor-pointer transition-colors ${statusFilter === 'unassigned' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
                onClick={() => {
                  setStatusFilter(statusFilter === 'unassigned' ? null : 'unassigned');
                  setCurrentPage(1);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
                      <p className="text-2xl font-bold">{unassignedCount}</p>
                    </div>
                    <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${statusFilter === 'assigned' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
                onClick={() => {
                  setStatusFilter(statusFilter === 'assigned' ? null : 'assigned');
                  setCurrentPage(1);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Assigned</p>
                      <p className="text-2xl font-bold">{assignedCount}</p>
                      <p className="text-xs text-muted-foreground">Most: {mostAssignedOrg}</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Search className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${statusFilter === 'assigned-not-converted' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
                onClick={() => {
                  setStatusFilter(statusFilter === 'assigned-not-converted' ? null : 'assigned-not-converted');
                  setCurrentPage(1);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Conversion</p>
                      <p className="text-2xl font-bold">{assignedNotConvertedCount}</p>
                      <p className="text-xs text-muted-foreground">Assigned but not converted</p>
                    </div>
                    <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {statusFilter && (
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                <span className="text-sm text-blue-700">
                  Filtered by: <strong>
                    {statusFilter === 'unassigned' ? 'Unassigned' :
                      statusFilter === 'assigned' ? 'Assigned' :
                        statusFilter === 'assigned-not-converted' ? 'Pending Conversion' : statusFilter}
                  </strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter(null);
                    setCurrentPage(1);
                  }}
                  className="text-blue-700 hover:text-blue-800"
                >
                  Clear Filter
                </Button>
              </div>
            )}
            {isLoading ? (
              <div className="text-center p-4">Loading...</div>
            ) : error ? (
              <div className="text-center p-4 text-red-500">Error: {error.message}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode DDP</TableHead>
                    <TableHead>Nama Data</TableHead>
                    <TableHead>Jenis Data</TableHead>
                    <TableHead>Sumber Referensi</TableHead>
                    <TableHead>Definisi Operasional</TableHead>
                    <TableHead>Produsen</TableHead>
                    <TableHead>Jadwal Rilis</TableHead>
                    <TableHead>Delegasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDatasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="font-mono text-xs">{dataset.code}</TableCell>
                      <TableCell className="max-w-[250px] font-medium text-sm whitespace-normal break-words line-clamp-2" title={dataset.name}>
                        {dataset.name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            dataset.data_type === "spasial" 
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800" 
                              : dataset.data_type === "keuangan"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                          }
                        >
                          {dataset.data_type ? dataset.data_type.toUpperCase() : "STATISTIK"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">{dataset.source_reference || "-"}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Badge
                              variant={dataset.operational_definition ? "default" : "destructive"}
                              className="cursor-pointer"
                            >
                              {dataset.operational_definition ? "View Definition" : "Missing"}
                            </Badge>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Operational Definition</DialogTitle>
                              <DialogDescription>{dataset.name} ({dataset.code})</DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 max-h-96 overflow-y-auto">
                              <p className="text-sm whitespace-pre-wrap">
                                {dataset.operational_definition || "No operational definition provided for this dataset."}
                              </p>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>{dataset.producing_agency || "-"}</TableCell>
                      <TableCell>{dataset.update_schedule || "-"}</TableCell>
                      <TableCell>
                        <span
                          title={dataset.assigned_org_data?.name || ""}
                          className="cursor-help font-medium"
                        >
                          {dataset.assigned_org_data?.short_name || dataset.assigned_org_data?.name || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            dataset.status === "assigned" || dataset.status === "claimed"
                              ? "bg-green-500 hover:bg-green-600 text-white" 
                              : "bg-amber-500 hover:bg-amber-600 text-white"
                          }
                        >
                          {dataset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(dataset.updated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {permissions.isWalidataReadOnly ? (
                          <Badge variant="secondary">View Only</Badge>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* Management Actions for Coordinator/Admin */}
                            {permissions.canManagePriorityData && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenEditDialog(dataset)}
                                title="Ubah Data Prioritas"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Delete Action is strictly for Administrators only */}
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleOpenDeleteDialog(dataset)}
                                title="Hapus Data Prioritas"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Workflow Actions */}
                            {dataset.status === 'unassigned' && permissions.canManagePriorityData && (
                              <Button size="sm" variant="outline" onClick={() => handleOpenAssignDialog(dataset)}>
                                Assign
                              </Button>
                            )}
                            {(dataset.status === 'assigned' || dataset.status === 'claimed') && (
                              <div className="flex items-center gap-1.5">
                                {dataset.is_converted ? (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200">
                                    Converted
                                  </Badge>
                                ) : permissions.canManagePriorityData ? (
                                  <Button size="sm" variant="default" onClick={() => convertMutation.mutate(dataset)} disabled={convertMutation.isPending}>
                                    {convertMutation.isPending ? "Converting..." : "Convert"}
                                  </Button>
                                ) : null}
                                {permissions.canManagePriorityData && (
                                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleOpenResetDialog(dataset)}>
                                    Reset
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          {totalPages > 1 && (
            <CardFooter>
              {renderPagination()}
            </CardFooter>
          )}
        </Card>
      </div>

      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        dataset={selectedDataset}
      />

      <ResetDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        dataset={selectedDataset}
        onConfirm={() => selectedDataset && resetMutation.mutate(selectedDataset.id)}
        isPending={resetMutation.isPending}
      />

      <CreateEditDialog
        open={createEditDialogOpen}
        onOpenChange={setCreateEditDialogOpen}
        dataset={selectedDataset}
        onCreate={(data) => createMutation.mutate(data)}
        onUpdate={(id, data) => updateMutation.mutate({ id, updates: data })}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        dataset={selectedDataset}
        onConfirm={() => selectedDataset && deleteMutation.mutate(selectedDataset.id)}
        isPending={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}

function AssignDialog({ open, onOpenChange, dataset }: { open: boolean; onOpenChange: (open: boolean) => void; dataset: PriorityDataset | null; }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedOrgName, setSelectedOrgName] = useState<string>("");

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("org_organizations").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!dataset || !selectedOrg) throw new Error("Missing data");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("priority_datasets").update({
        assigned_org: selectedOrg,
        status: "assigned",
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      }).eq("id", dataset.id);
      if (error) throw error;

      await supabase.from("priority_dataset_logs").insert({
        priority_dataset_id: dataset.id,
        action: "assign",
        actor_id: user.id,
        org_id: selectedOrg,
        notes: `Dataset assigned to organization`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
      toast({ title: "Success", description: "Dataset assigned successfully" });
      onOpenChange(false);
      setSelectedOrg("");
      setSelectedOrgName("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to assign dataset", variant: "destructive" });
    },
  });

  const handleOrgChange = (orgId: string) => {
    setSelectedOrg(orgId);
    const org = organizations.find(o => o.id === orgId);
    setSelectedOrgName(org?.name || "");
  };

  useEffect(() => {
    if (!open) {
      setSelectedOrg("");
      setSelectedOrgName("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Priority Dataset</DialogTitle>
          <DialogDescription>Confirm assignment of this priority dataset to an organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div>
              <p className="text-sm font-semibold">{dataset?.name}</p>
              <p className="text-xs text-muted-foreground">Code: {dataset?.code}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Select Organization</label>
            <Select value={selectedOrg} onValueChange={handleOrgChange}>
              <SelectTrigger><SelectValue placeholder="Choose an organization" /></SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (<SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => assignMutation.mutate()} disabled={!selectedOrg || assignMutation.isPending}>
            {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ open, onOpenChange, dataset, onConfirm, isPending }: { open: boolean; onOpenChange: (open: boolean) => void; dataset: PriorityDataset | null; onConfirm: () => void; isPending: boolean; }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" />Reset Priority Dataset</DialogTitle>
          <DialogDescription>This action will fully reset the dataset to unassigned status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
            <p className="text-sm font-semibold">{dataset?.name}</p>
            <p className="text-xs text-muted-foreground">Code: {dataset?.code}</p>
          </div>
          <p className="text-sm text-muted-foreground">Are you sure you want to proceed? This action cannot be undone.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Resetting..." : "Reset Dataset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateEditDialog({
  open,
  onOpenChange,
  dataset,
  onCreate,
  onUpdate,
  isPending
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: PriorityDataset | null;
  onCreate: (data: any) => void;
  onUpdate: (id: string, data: any) => void;
  isPending: boolean;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [dataType, setDataType] = useState("statistik");
  const [updateSchedule, setUpdateSchedule] = useState("Tahunan");
  const [operationalDefinition, setOperationalDefinition] = useState("");
  const [producingAgency, setProducingAgency] = useState("");
  const [proposingAgency, setProposingAgency] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (dataset) {
        setCode(dataset.code || "");
        setName(dataset.name || "");
        setSourceReference(dataset.source_reference || "");
        setDataType(dataset.data_type || "statistik");
        setUpdateSchedule(dataset.update_schedule || "Tahunan");
        setOperationalDefinition(dataset.operational_definition || "");
        setProducingAgency(dataset.producing_agency || "");
        setProposingAgency(dataset.proposing_agency || "");
      } else {
        setCode("");
        setName("");
        setSourceReference("");
        setDataType("statistik");
        setUpdateSchedule("Tahunan");
        setOperationalDefinition("");
        setProducingAgency("");
        setProposingAgency("");
      }
      setErrors({});
    }
  }, [open, dataset]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!code) {
      newErrors.code = "Kode DDP wajib diisi";
    } else if (!/^\d{2}\.\d{2}\.\d{4,5}$/.test(code)) {
      newErrors.code = "Format kode tidak valid (harus XX.XX.XXXX atau XX.XX.XXXXX)";
    }
    if (!name.trim()) {
      newErrors.name = "Nama dataset wajib diisi";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      code,
      name,
      source_reference: sourceReference,
      data_type: dataType,
      update_schedule: updateSchedule,
      operational_definition: operationalDefinition,
      producing_agency: producingAgency,
      proposing_agency: proposingAgency
    };

    if (dataset) {
      onUpdate(dataset.id, payload);
    } else {
      onCreate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{dataset ? "Ubah Data Prioritas" : "Tambah Data Prioritas"}</DialogTitle>
          <DialogDescription>
            {dataset ? "Ubah detail informasi data prioritas yang ada." : "Tambahkan data prioritas baru ke daftar."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kode DDP (XX.XX.XXXXX) *</label>
              <Input
                value={code}
                onChange={handleCodeChange}
                placeholder="Contoh: 62.01.00001"
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sumber Referensi *</label>
              <Input
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                placeholder="Contoh: RPJMN 2025-2029"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Dataset *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Jumlah Penduduk Menurut Golongan Umur"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Dataset *</label>
              <Select value={dataType} onValueChange={setDataType}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="statistik">Statistik</SelectItem>
                  <SelectItem value="spasial">Spasial</SelectItem>
                  <SelectItem value="keuangan">Keuangan</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jadwal Rilis Data *</label>
              <Select value={updateSchedule} onValueChange={setUpdateSchedule}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih frekuensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tahunan">Tahunan</SelectItem>
                  <SelectItem value="Semesteran">Semesteran</SelectItem>
                  <SelectItem value="Triwulanan">Triwulanan</SelectItem>
                  <SelectItem value="Bulanan">Bulanan</SelectItem>
                  <SelectItem value="Mingguan">Mingguan</SelectItem>
                  <SelectItem value="Harian">Harian</SelectItem>
                  <SelectItem value="Sesuai Kebutuhan">Sesuai Kebutuhan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Definisi Operasional</label>
            <Textarea
              value={operationalDefinition}
              onChange={(e) => setOperationalDefinition(e.target.value)}
              placeholder="Definisi operasional dataset..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Instansi Produsen</label>
              <Input
                value={producingAgency}
                onChange={(e) => setProducingAgency(e.target.value)}
                placeholder="Contoh: Dinas Kesehatan"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instansi Pengusul</label>
              <Input
                value={proposingAgency}
                onChange={(e) => setProposingAgency(e.target.value)}
                placeholder="Contoh: Bappeda"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  dataset,
  onConfirm,
  isPending
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: PriorityDataset | null;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" /> Hapus Data Prioritas
          </DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
            <p className="text-sm font-semibold text-red-800">{dataset?.name}</p>
            <p className="text-xs text-red-600">Kode: {dataset?.code}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Apakah Anda yakin ingin menghapus data prioritas ini secara permanen dari sistem?
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Menghapus..." : "Hapus Permanen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
