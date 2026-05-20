import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      // 1. Check for PKCE flow (token_hash in query params)
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const next = searchParams.get("next") || "/update-password";

      if (token_hash && type) {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });

          if (error) throw error;
          
          navigate(next, { replace: true });
        } catch (error: any) {
          toast({
            title: "Verification Failed",
            description: error.message || "The verification link is invalid or has expired.",
            variant: "destructive",
          });
          navigate("/auth", { replace: true });
        } finally {
          setIsVerifying(false);
        }
        return;
      }

      // 2. Check for Implicit flow (access_token in hash fragment)
      // Supabase JS will automatically process this and establish a session.
      // We just need to check if a session exists, or if the URL had a recovery hash.
      const hashString = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hashString);
      const accessToken = hashParams.get("access_token");
      const hashType = hashParams.get("type");

      if (accessToken && hashType === "recovery") {
        // Clear the hash from the URL to be clean
        window.history.replaceState(null, "", window.location.pathname);
        navigate(next || "/update-password", { replace: true });
        return;
      }

      // If we reach here, it's an invalid request (no tokens found)
      toast({
        title: "Invalid Request",
        description: "Missing verification token. Please request a new password reset.",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
      setIsVerifying(false);
    };

    verifyToken();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {isVerifying ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-medium">Verifying your link...</h2>
          <p className="text-muted-foreground mt-2">Please wait a moment while we securely verify your request.</p>
        </>
      ) : (
        <h2 className="text-xl font-medium">Redirecting...</h2>
      )}
    </div>
  );
}
