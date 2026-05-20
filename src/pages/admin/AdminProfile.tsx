import { useState } from "react";
import { z } from "zod";
import { Lock, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";

const changePasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(128),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AdminProfile() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const { user } = useAuth();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      changePasswordSchema.parse({ password, confirmPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const formErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            formErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(formErrors);
        return;
      }
    }

    setIsLoading(true);
    
    // Call Supabase auth to update the user's password
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });
      // Clear the form
      setPassword("");
      setConfirmPassword("");
    }
    
    setIsLoading(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and credentials.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <UserIcon className="w-5 h-5 mr-2" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Email Address</p>
              <p className="text-base">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Lock className="w-5 h-5 mr-2" />
              Change Password
            </CardTitle>
            <CardDescription>
              Ensure your account is using a long, random password to stay secure.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Lock className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
              
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
