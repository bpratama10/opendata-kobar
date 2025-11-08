import { useEffect, ReactNode, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AdminSidebar } from "./AdminSidebar";
import { Shield, LogOut, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { canAccessAdmin, loading, rolesReady, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasRedirected = useRef(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    if (!loading && rolesReady && !hasRedirected.current) {
      if (!isAuthenticated) {
        hasRedirected.current = true;
        navigate("/auth", { replace: true });
      } else if (!canAccessAdmin) {
        hasRedirected.current = true;
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin panel.",
          variant: "destructive",
        });
        navigate("/", { replace: true });
      }
    }
  }, [canAccessAdmin, loading, rolesReady, isAuthenticated, navigate, toast]);

  if (loading || !rolesReady) {
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

  if (!isAuthenticated || !canAccessAdmin) {
    return null;
  }

  if (isDesktop) {
    return (
      <div className="min-h-screen flex w-full flex-col">
        <div className="flex flex-1">
          <AdminSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center border-b bg-background px-6">
              <div className="flex-1 flex items-center justify-between">
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
            <main className="flex-1 p-6 bg-muted/40">
              {children}
            </main>
          </div>
        </div>
        <footer className="border-t bg-background px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <div className="mb-2 md:mb-0">
              © 2025 Dinas Komunikasi Informatika, Statisitk dan Persandian. All rights reserved.
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-4">
              <div className="flex items-center space-x-4">
                <span>📞 +62 812-3366-2151</span>
                <span>✉️ satudata@kotawaringinbaratkab.go.id</span>
              </div>
              <div className="text-center md:text-right">
                Built with ❤️ by Bidang Statistik
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <header className="h-14 flex items-center border-b bg-background px-4">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <AdminSidebar />
          </SheetContent>
        </Sheet>
        <div className="flex-1 flex items-center justify-between ml-4">
          <h1 className="text-lg font-semibold">Admin</h1>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 bg-muted/40">
        {children}
      </main>
      <footer className="border-t bg-background px-4 py-4">
        <div className="flex flex-col items-center text-sm text-muted-foreground space-y-2">
          <div className="text-center">
            © 2025 Dinas Komunikasi Informatika, Statisitk dan Persandian. All rights reserved.
          </div>
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center space-x-4">
              <span>📞 +62 812-3366-2151</span>
              <span>✉️ satudata@kotawaringinbaratkab.go.id</span>
            </div>
            <div className="text-center">
              Built with ❤️ by Bidang Statistik
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
