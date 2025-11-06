import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AlertCircle } from "lucide-react";

type PriorityDataset = {
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
  assigned_org_data?: { name: string } | null;
  is_converted?: boolean;
};

const fetchPriorityDatasets = async (): Promise<PriorityDataset[]> => {
  const { data, error } = await supabase
    .from("priority_datasets")
    .select(`
      *, 
      assigned_org_data:org_organizations!assigned_org(name)
    `)
    .order("code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Check which datasets have been converted
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

export function PriorityDataTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { permissions } = useRoleAccess();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<PriorityDataset | null>(null);

  const { data: datasets, isLoading, error } = useQuery({
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
      toast({
        title: "Success",
        description: "Priority dataset converted to catalog dataset",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert dataset",
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('priority_datasets')
        .update({
          status: 'unassigned',
          assigned_org: null,
          assigned_by: null,
          assigned_at: null,
          claimed_by: null,
          claimed_at: null
        })
        .eq('id', datasetId);
      
      if (error) throw error;
      
      // Log the reset action
      await supabase.from('priority_dataset_logs').insert({
        priority_dataset_id: datasetId,
        action: 'reset',
        actor_id: user.id,
        notes: 'Dataset reset to unassigned status'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
      setResetDialogOpen(false);
      setSelectedDataset(null);
      toast({
        title: "Success",
        description: "Dataset reset successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset dataset",
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Operational Definition</TableHead>
            <TableHead>Producing Agency</TableHead>
            <TableHead>Update Schedule</TableHead>
            <TableHead>Assigned ORG</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {datasets?.map((dataset) => (
            <TableRow key={dataset.id}>
              <TableCell>{dataset.code}</TableCell>
              <TableCell>{dataset.name}</TableCell>
              <TableCell>
                <div className="max-w-xs truncate" title={dataset.operational_definition}>
                  {dataset.operational_definition || "N/A"}
                </div>
              </TableCell>
              <TableCell>{dataset.producing_agency}</TableCell>
              <TableCell>{dataset.update_schedule}</TableCell>
              <TableCell>{dataset.assigned_org_data?.name || "N/A"}</TableCell>
              <TableCell>
                <Badge>{dataset.status}</Badge>
              </TableCell>
              <TableCell>{new Date(dataset.updated_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {permissions.isWalidataReadOnly ? (
                  <Badge variant="secondary">View Only</Badge>
                ) : (
                  <>
                    {dataset.status === 'unassigned' && permissions.canManagePriorityData && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDataset(dataset);
                          setAssignDialogOpen(true);
                        }}
                      >
                        Assign to Organization
                      </Button>
                    )}
                    {(dataset.status === 'assigned' || dataset.status === 'claimed') && (
                      <div className="flex items-center gap-2">
                        {dataset.is_converted ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                            Converted
                          </Badge>
                        ) : permissions.canManagePriorityData ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => convertMutation.mutate(dataset)}
                            disabled={convertMutation.isPending}
                          >
                            {convertMutation.isPending ? "Converting..." : "Convert to Dataset"}
                          </Button>
                        ) : null}
                        {permissions.canManagePriorityData && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDataset(dataset);
                              setResetDialogOpen(true);
                            }}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
    </div>
  );
}

function AssignDialog({
  open,
  onOpenChange,
  dataset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: PriorityDataset | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedOrgName, setSelectedOrgName] = useState<string>("");

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_organizations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!dataset || !selectedOrg) throw new Error("Missing data");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("priority_datasets")
        .update({
          assigned_org: selectedOrg,
          status: "assigned",
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", dataset.id);

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
      toast({
        title: "Success",
        description: "Dataset assigned successfully",
      });
      onOpenChange(false);
      setSelectedOrg("");
      setSelectedOrgName("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign dataset",
        variant: "destructive",
      });
    },
  });

  const handleOrgChange = (orgId: string) => {
    setSelectedOrg(orgId);
    const org = organizations.find(o => o.id === orgId);
    setSelectedOrgName(org?.name || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Priority Dataset</DialogTitle>
          <DialogDescription>
            Confirm assignment of this priority dataset to an organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div>
              <p className="text-sm font-semibold">{dataset?.name}</p>
              <p className="text-xs text-muted-foreground">Code: {dataset?.code}</p>
            </div>
            {dataset?.operational_definition && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Operational Definition:</p>
                <p className="text-xs">
                  {dataset.operational_definition.length > 150
                    ? `${dataset.operational_definition.substring(0, 150)}...`
                    : dataset.operational_definition}
                </p>
              </div>
            )}
            {dataset?.producing_agency && (
              <p className="text-xs text-muted-foreground">Producing Agency: {dataset.producing_agency}</p>
            )}
            {dataset?.update_schedule && (
              <p className="text-xs text-muted-foreground">Update Schedule: {dataset.update_schedule}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Select Organization</label>
            <Select value={selectedOrg} onValueChange={handleOrgChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedOrgName && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm">
                Are you sure you want to assign <span className="font-semibold">{dataset?.name}</span> to{" "}
                <span className="font-semibold">{selectedOrgName}</span>?
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedOrg || assignMutation.isPending}
          >
            {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({
  open,
  onOpenChange,
  dataset,
  onConfirm,
  isPending,
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
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Reset Priority Dataset
          </DialogTitle>
          <DialogDescription>
            This action will fully reset the dataset to unassigned status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
            <p className="text-sm font-semibold">{dataset?.name}</p>
            <p className="text-xs text-muted-foreground">Code: {dataset?.code}</p>
            {dataset?.assigned_org_data && (
              <p className="text-xs">
                <span className="font-medium">Currently assigned to:</span>{" "}
                {dataset.assigned_org_data.name}
              </p>
            )}
            <p className="text-xs">
              <span className="font-medium">Status:</span> {dataset?.status}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium mb-2">This will:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Set status to "unassigned"</li>
              <li>Clear organization assignment</li>
              <li>Remove all assignment/claim data</li>
              <li>Reset as if never assigned</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to proceed? This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Resetting..." : "Reset Dataset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
