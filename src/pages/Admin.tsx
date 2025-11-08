import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Users, 
  FileText, 
  Tags, 
  Building, 
  BarChart3,
  Shield,
  Download,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DatasetStatusCard } from "@/components/admin/DatasetStatusCard";

interface AdminStats {
  datasets: number;
  users: number;
  downloads: number;
  organizations: number;
}

export default function Admin() {
  const { canAccessAdmin, loading, isAuthenticated, profile, orgRoles } = useAuth();
  const { isAdmin } = useRoleAccess();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
      navigate("/auth");
    }
  };
  const [stats, setStats] = useState<AdminStats>({
    datasets: 0,
    users: 0, 
    downloads: 0,
    organizations: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Use org roles instead of profile.role (removed for security)
      const isGlobalAdmin = orgRoles.some((role) => role.code === 'ADMIN');
      
      let datasetsQuery = supabase.from('catalog_metadata').select('*', { count: 'exact', head: true });
      let usersQuery = supabase.from('org_users').select('*', { count: 'exact', head: true }).eq('is_active', true);
      let downloadsQuery = supabase.from('telemetry_downloads').select('*', { count: 'exact', head: true });
      
      // For non-admin users, filter by organization
      if (!isGlobalAdmin) {
        const { data: orgId, error: orgError } = await supabase.rpc('get_user_org_id');
        
        if (orgError) {
          console.error('Error getting user org_id:', orgError);
          throw orgError;
        }

        datasetsQuery = datasetsQuery.eq('publisher_org_id', orgId);
        usersQuery = usersQuery.eq('org_id', orgId);
        downloadsQuery = supabase
          .from('telemetry_downloads')
          .select(`
            *,
            catalog_distributions!inner(
              catalog_resources!inner(
                catalog_metadata!inner(
                  publisher_org_id
                )
              )
            )
          `, { count: 'exact', head: true })
          .eq('catalog_distributions.catalog_resources.catalog_metadata.publisher_org_id', orgId);
      }

      const [datasetsResult, usersResult, downloadsResult, orgsResult] = await Promise.all([
        datasetsQuery,
        usersQuery,
        downloadsQuery,
        supabase.from('org_organizations').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        datasets: datasetsResult.count || 0,
        users: usersResult.count || 0,
        downloads: downloadsResult.count || 0,
        organizations: orgsResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching org-specific stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && (!isAuthenticated || !canAccessAdmin)) {
      navigate("/auth");
    }
  }, [canAccessAdmin, loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && canAccessAdmin) {
      fetchStats();
    }
  }, [isAuthenticated, canAccessAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !canAccessAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col">
        <div className="flex flex-1">
          <AdminSidebar />

          <div className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b bg-background">
              <SidebarTrigger className="ml-2" />
              <div className="flex-1 flex items-center justify-between px-6">
                <h1 className="text-lg font-semibold">Admin Dashboard</h1>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {orgRoles.length > 0 ? (
                      <div className="flex items-center gap-1">
                        {orgRoles.map((role, index) => (
                          <Badge key={`${role.code}-${index}`} variant="secondary" className="text-xs">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No Role</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </header>

            <main className="flex-1 p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Dashboard Overview</h2>
                  <p className="text-muted-foreground">
                    Welcome to the data catalog administration panel
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {isAdmin ? 'Total Datasets' : 'Organization Datasets'}
                      </CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : stats.datasets.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin ? 'All datasets' : 'Datasets from your organization'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {isAdmin ? 'Total Users' : 'Organization Users'}
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : stats.users.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin ? 'All active users' : 'Active users in your organization'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {isAdmin ? 'Total Downloads' : 'Organization Downloads'}
                      </CardTitle>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : stats.downloads.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin ? 'All downloads' : 'Downloads from your datasets'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : stats.organizations.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Registered organizations
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <DatasetStatusCard />

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Database Tables</CardTitle>
                      <CardDescription>
                        Core data catalog tables and their status
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">catalog_metadata</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">catalog_resources</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">catalog_distributions</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">org_organizations</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">profiles</span>
                        <Badge variant="default">New</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>
                        Common administrative tasks
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => navigate("/admin/datasets")}
                      >
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Manage Datasets</p>
                          <p className="text-xs text-muted-foreground">Create and edit data catalogs</p>
                        </div>
                      </div>
                      <div
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => navigate("/admin/users")}
                      >
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">User Management</p>
                          <p className="text-xs text-muted-foreground">Manage user roles and access</p>
                        </div>
                      </div>
                      <div
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => navigate("/admin/tags")}
                      >
                        <Tags className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Tags & Themes</p>
                          <p className="text-xs text-muted-foreground">Organize dataset categories</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </main>
          </div>
        </div>

        <footer className="border-t bg-background px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <div className="mb-2 md:mb-0">
              © 2025 Open Data Kobar. All rights reserved.
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-4">
              <div className="flex items-center space-x-4">
                <span>📞 +62 123 456 7890</span>
                <span>✉️ support@opendatakobar.com</span>
              </div>
              <div className="text-center md:text-right">
                Built with ❤️ by Open Data Team
              </div>
            </div>
          </div>
        </footer>
      </div>
    </SidebarProvider>
  );
}
