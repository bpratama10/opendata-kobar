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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const fetchUnassignedPriorityDatasets = async () => {
  const { data, error } = await supabase
    .from("priority_datasets")
    .select("*")
    .eq("status", "unassigned");

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export function PriorityClaimList() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: datasets, isLoading, error } = useQuery({
    queryKey: ["unassigned-priority-datasets"],
    queryFn: fetchUnassignedPriorityDatasets,
  });

  const claimMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      if (!profile?.org_id) throw new Error("User organization not found.");

      const { error } = await supabase
        .from("priority_datasets")
        .update({
          status: "claimed",
          claimed_by: user!.id,
          claimed_at: new Date().toISOString(),
          assigned_org: profile.org_id,
        })
        .eq("id", datasetId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({ title: "Dataset claimed successfully!" });
      queryClient.invalidateQueries({ queryKey: ["unassigned-priority-datasets"] });
      queryClient.invalidateQueries({ queryKey: ["datasets"] }); // To refresh the user's main dataset list
    },
    onError: (error) => {
      toast({
        title: "Error claiming dataset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Proposing Agency</TableHead>
          <TableHead>Producing Agency</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {datasets?.map((dataset) => (
          <TableRow key={dataset.id}>
            <TableCell>{dataset.name}</TableCell>
            <TableCell>{dataset.proposing_agency}</TableCell>
            <TableCell>{dataset.producing_agency}</TableCell>
            <TableCell>
              <Button
                size="sm"
                onClick={() => claimMutation.mutate(dataset.id)}
                disabled={claimMutation.isPending}
              >
                {claimMutation.isPending ? "Claiming..." : "Claim Dataset"}
              </Button>
            </TableCell>
          </TableRow>
        )) || (
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              No unassigned priority datasets available.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
