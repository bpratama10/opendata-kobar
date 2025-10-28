import { LogIn, LogOut, User as UserIcon, Shield, List, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import lambangheader from "@/assets/lambang_opt.png";
import logo from "@/assets/logo.png";


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
      
<div className="bg-gray-100 border-t border-b">
        <div className="container mx-auto px-6 py-1.5 flex items-center justify-start text-xs text-gray-600">
          <img 
                src={lambangheader}
                alt="Lambang OPT" 
                className="w-4 h-4 object-contain"  
              /> 
          <span>&ensp; Website ini Resmi dikelola </span> <span className="font-outfit font-bold">&ensp;Pemerintah Kabupaten Kotawaringin Barat.</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="link" size="sm" className="ml-2 text-xs h-auto p-0">
                Pelajari
                <Info className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <span className="font-bold mr-2">Domain :</span> subdomain dari&ensp; <span className="italic">kotawaringinbaratkab.go.id.</span> 
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span className="font-bold mr-2">Aman :</span> mematuhi standar keamanan menggunakan protokol HTTPS (🔒).
              </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img 
                src={logo}
                alt="Logo Open Data" 
                className="w-10 h-10 object-contain"  
              />  
          <h1 className="text-xl font-outfit font-bold cursor-pointer" onClick={() => navigate("/")}>Open Data</h1>
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
