import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Key, Copy, Check, Trash2 } from "lucide-react";

interface APIKey {
  id: string;
  user_id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
  org_users?: {
    full_name: string;
    email: string;
  };
}

export default function AdminAPIKeys() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [keyName, setKeyName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const { data: keysData, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user details separately
      const userIds = [...new Set(keysData?.map((k) => k.user_id) || [])];
      const { data: usersData } = await supabase
        .from("org_users")
        .select("id, full_name, email")
        .in("id", userIds);

      const usersMap = new Map(usersData?.map((u) => [u.id, u]) || []);

      const enrichedKeys = keysData?.map((key) => ({
        ...key,
        org_users: usersMap.get(key.user_id),
      })) || [];

      setApiKeys(enrichedKeys);
    } catch (error: any) {
      console.error("Error fetching API keys:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAPIKey = async (userId: string, name: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { userId, name },
      });

      if (error) throw error;

      if (data?.success) {
        setGeneratedKey(data.apiKey);
        setShowKeyDialog(true);
        await fetchAPIKeys();
        toast({
          title: "Success",
          description: "API key generated successfully",
        });
      }
    } catch (error: any) {
      console.error("Error generating API key:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeAPIKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", keyId);

      if (error) throw error;

      await fetchAPIKeys();
      toast({
        title: "Success",
        description: "API key revoked successfully",
      });
    } catch (error: any) {
      console.error("Error revoking API key:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && apiKeys.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading API keys...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Key className="h-8 w-8" />
              API Keys Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage API keys for rate-limited public data access
            </p>
          </div>
        </div>

        {/* Generate New Key Form */}
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Generate New API Key</h2>
          <div className="flex gap-4">
            <Input
              placeholder="User ID (UUID)"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Key name (optional)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => generateAPIKey(selectedUserId, keyName)}
              disabled={!selectedUserId || loading}
            >
              Generate Key
            </Button>
          </div>
        </div>

        {/* API Keys Table */}
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.org_users?.full_name || "N/A"}</TableCell>
                  <TableCell>{key.org_users?.email || "N/A"}</TableCell>
                  <TableCell className="font-mono text-sm">{key.key_prefix}</TableCell>
                  <TableCell>{key.name || "—"}</TableCell>
                  <TableCell>
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {new Date(key.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        key.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {key.is_active ? "Active" : "Revoked"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {key.is_active && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeAPIKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Generated Key Dialog */}
        <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Generated</DialogTitle>
              <DialogDescription>
                Save this key securely. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all">
                {generatedKey}
              </div>
              <Button onClick={copyToClipboard} className="w-full">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
