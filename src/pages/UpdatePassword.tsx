import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const updatePasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(128),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      updatePasswordSchema.parse({ password, confirmPassword });
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

    // Sanity check: Ensure user is authenticated before trying to update password
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Session Expired",
        description: "Your password reset link is invalid or has expired. Please request a new one.",
        variant: "destructive",
      });
      navigate("/forgot-password");
      setIsLoading(false);
      return;
    }

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
      navigate("/");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Update Password</CardTitle>
            <CardDescription>
              Please enter your new password below.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
