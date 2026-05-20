import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { KeyRound, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      forgotPasswordSchema.parse({ email });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    // Construct the redirect URL for the confirmation route
    const redirectUrl = `${window.location.origin}/auth/confirm?next=/update-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (resetError) {
      toast({
        title: "Error",
        description: resetError.message,
        variant: "destructive",
      });
    } else {
      setIsSuccess(true);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-medium">Check your email</h3>
                <p className="text-muted-foreground text-sm">
                  We have sent a password reset link to <span className="font-semibold">{email}</span>.
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setIsSuccess(false)}
                >
                  Try another email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
