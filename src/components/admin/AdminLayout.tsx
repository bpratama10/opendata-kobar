import { useEffect, ReactNode, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { canAccessAdmin, loading, rolesReady, isAuthenticated, isViewer, orgRoles } = useAuth();
  const { isProdusen, isAdmin, isWalidata, isKoordinator } = useRoleAccess();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasRedirected = useRef(false);

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

  useEffect(() => {
    // Only make access decisions after authentication check and roles are ready
    // Use ref to prevent multiple redirects
    if (!loading && rolesReady && !hasRedirected.current) {
      const currentPath = window.location.pathname;
      console.log('🚦 [access] AdminLayout decision:', { 
        isAuthenticated, 
        canAccessAdmin, 
        isViewer, 
        rolesReady,
        orgRolesCount: orgRoles.length,
        orgRoles: orgRoles.map(r => r.code),
        currentPath,
        hasRedirected: hasRedirected.current
      });
      
      if (!isAuthenticated) {
        console.log('🔒 [redirect] Not authenticated → /auth');
        hasRedirected.current = true;
        navigate("/auth", { replace: true });
      } else if (!canAccessAdmin) {
        console.log('🚫 [redirect] No admin access → /');
        hasRedirected.current = true;
        toast({
          title: "Access Denied", 
          description: "You don't have permission to access the admin panel.",
          variant: "destructive",
        });
        navigate("/", { replace: true });
      } else {
        console.log('✅ [access] Granted to admin panel');
        
        // Safe default: if on /admin root or forbidden section for PRODUSEN, redirect to /admin/datasets
        const isProdusenOnly = isProdusen && !isAdmin && !isWalidata && !isKoordinator;
        const forbiddenPaths = ['/admin/organizations', '/admin/users', '/admin/roles', '/admin/audit'];
        const isForbidden = isProdusenOnly && forbiddenPaths.some(p => currentPath.startsWith(p));
        
        if (currentPath === '/admin' || isForbidden) {
          console.log('🔀 [redirect] Safe default → /admin/datasets');
          navigate("/admin/datasets", { replace: true });
        }
      }
    } else {
      console.log('⏳ [waiting] Loading or not ready:', { 
        loading, 
        rolesReady, 
        hasRedirected: hasRedirected.current 
      });
    }
  }, [canAccessAdmin, loading, rolesReady, isAuthenticated, navigate, toast, orgRoles]);

  // Show loading while authentication or roles are being resolved
  if (loading || !rolesReady) {
    console.log('🔄 AdminLayout loading state:', { loading, rolesReady });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse">
            <Shield className="w-8 h-8 mx-auto text-primary" />
          </div>
          <div className="text-lg">Loading admin panel...</div>
          <div className="text-sm text-muted-foreground">Verifying access permissions</div>
        </div>
      </div>
    );
  }

  // Don't render admin layout for users without admin access
  // (they will be redirected by the useEffect above)
  if (!isAuthenticated || !canAccessAdmin) {
    console.log('🚫 AdminLayout blocked render:', { 
      isAuthenticated, 
      canAccessAdmin, 
      isViewer,
      orgRolesCount: orgRoles.length
    });
    return null;
  }

  console.log('🎉 AdminLayout rendering admin panel');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-background">
            <SidebarTrigger className="ml-2" />
            <div className="flex-1 flex items-center justify-between px-6">
              <h1 className="text-lg font-semibold">Admin Dashboard</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Administrator</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}