import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface UnpublishRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: { id: string; title: string } | null;
  onSuccess: () => void;
}

export function UnpublishRequestDialog({
  open,
  onOpenChange,
  dataset,
  onSuccess,
}: UnpublishRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!dataset || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the unpublish request",
        variant: "destructive",
      });
      return;
    }

    if (reason.length > 300) {
      toast({
        title: "Error",
        description: "Reason must be 300 characters or less",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("catalog_metadata")
        .update({ 
          unpublish_request_reason: reason.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", dataset.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Unpublish request submitted successfully",
      });

      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error submitting unpublish request:", error);
      toast({
        title: "Error",
        description: "Failed to submit unpublish request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Unpublish</DialogTitle>
          <DialogDescription>
            Please provide a reason for requesting to unpublish "{dataset?.title}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (max 300 characters)</Label>
            <Textarea
              id="reason"
              placeholder="Enter your reason for unpublishing this dataset..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              {reason.length}/300 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setReason("");
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
