import { LogIn, LogOut, User as UserIcon, Shield, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const { user, profile, canAccessAdmin, orgRoles } = useAuth();
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
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate("/")}>DataHub</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dataset-list")}>
            <List className="w-4 h-4 mr-2" />
            Dataset List
          </Button>
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                {canAccessAdmin && (
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary font-medium">
                      {orgRoles.find(r => ['ADMIN', 'WALIDATA'].includes(r.code))?.name || 
                       orgRoles.find(r => ['KOORDINATOR', 'PRODUSEN'].includes(r.code))?.name || 
                       'Administrator'}
                    </span>
                  </div>
                )}
              </div>
              {canAccessAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate("/auth")}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};