import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Eye, Download, Filter } from "lucide-react";

interface AuditEvent {
  id: number;
  actor_id: string | null;
  action: string;
  object_type: string | null;
  object_id: string | null;
  context: any;
  created_at: string;
}

export function AuditManagement() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchAuditEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('telemetry_audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent events

      if (error) {
        console.error('Error fetching audit events:', error);
        return;
      }

      setAuditEvents(data || []);
    } catch (error) {
      console.error('Error fetching audit events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, []);

  const filteredEvents = auditEvents.filter(event => {
    const matchesSearch = event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.object_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = !actionFilter || event.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  // Get unique actions for filter
  const uniqueActions = [...new Set(auditEvents.map(e => e.action))];

  // Calculate stats
  const totalEvents = auditEvents.length;
  const todayEvents = auditEvents.filter(e => 
    new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length;
  const uniqueActors = new Set(auditEvents.filter(e => e.actor_id).map(e => e.actor_id)).size;

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      case 'login':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading audit events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Monitor system activities and user actions</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Log
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{totalEvents}</div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </div>
              <Settings className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{todayEvents}</div>
            <div className="text-sm text-muted-foreground">Today's Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{uniqueActors}</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Events</CardTitle>
          <div className="flex space-x-4">
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Object Type</th>
                  <th className="text-left p-2">Actor</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <Badge variant={getActionColor(event.action)}>
                        {event.action}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {event.object_type || "—"}
                    </td>
                    <td className="p-2">
                      {event.actor_id ? `User ${event.actor_id.slice(0, 8)}...` : "System"}
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No audit events found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}