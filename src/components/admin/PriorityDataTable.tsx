import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
};

const fetchPriorityDatasets = async () => {
  const { data, error } = await supabase
    .from("priority_datasets")
    .select(`
      *, 
      assigned_org_data:org_organizations!assigned_org(name)
    `);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export function PriorityDataTable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: datasets, isLoading, error } = useQuery({
    queryKey: ["priority-datasets"],
    queryFn: fetchPriorityDatasets,
  });
  const [selectedDataset, setSelectedDataset] = useState<PriorityDataset | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const convertMutation = useMutation({
    mutationFn: async (dataset: PriorityDataset) => {
      if (!dataset.assigned_org) {
        throw new Error("Dataset must be assigned to an organization first");
      }

      const { data, error } = await supabase.rpc("fn_convert_priority_to_dataset", {
        p_priority_dataset_id: dataset.id,
        p_assignee_org_id: dataset.assigned_org,
        p_user_id: user?.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Priority dataset converted to catalog dataset successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Operational Definition</TableHead>
            <TableHead>Producing Agency</TableHead>
            <TableHead>Source Reference</TableHead>
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Badge variant={dataset.operational_definition ? "default" : "destructive"} className="cursor-pointer">
                      {dataset.operational_definition ? "View" : "Missing"}
                    </Badge>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Operational Definition</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                      {dataset.operational_definition || "No definition provided."}
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              </TableCell>
              <TableCell>{dataset.producing_agency}</TableCell>
              <TableCell>{dataset.source_reference}</TableCell>
              <TableCell>{dataset.update_schedule}</TableCell>
              <TableCell>{dataset.assigned_org_data?.name || "N/A"}</TableCell>
              <TableCell>
                <Badge>{dataset.status}</Badge>
              </TableCell>
              <TableCell>{new Date(dataset.updated_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {dataset.status === 'unassigned' && (
                  <Button size="sm" onClick={() => {
                    setSelectedDataset(dataset);
                    setIsAssignDialogOpen(true);
                  }}>
                    Assign to ORG
                  </Button>
                )}
                {(dataset.status === 'assigned' || dataset.status === 'claimed') && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => convertMutation.mutate(dataset)}
                    disabled={convertMutation.isPending}
                  >
                    {convertMutation.isPending ? "Converting..." : "Convert to Dataset"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )) || (
            <TableRow>
              <TableCell colSpan={10} className="text-center">
                No priority datasets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AssignDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        dataset={selectedDataset}
      />
    </>
  );
}

function AssignDialog({ open, onOpenChange, dataset }: { open: boolean, onOpenChange: (open: boolean) => void, dataset: PriorityDataset | null }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  const { data: organizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("org_organizations").select("id, name");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (orgId: string) => {
      if (!user) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from("priority_datasets")
        .update({
          status: "assigned",
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
          assigned_org: orgId,
        })
        .eq("id", dataset.id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({ title: "Dataset assigned successfully!" });
      queryClient.invalidateQueries({ queryKey: ["priority-datasets"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error assigning dataset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (selectedOrg) {
      assignMutation.mutate(selectedOrg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Priority Dataset</DialogTitle>
          <DialogDescription>
            Assign "{dataset?.name}" to an organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select onValueChange={setSelectedOrg}>
            <SelectTrigger>
              <SelectValue placeholder="Select an organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations?.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAssign} disabled={!selectedOrg || assignMutation.isPending}>
            {assignMutation.isPending ? "Assigning..." : "Assign Dataset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
