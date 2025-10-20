import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fetchUserSession = async () => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  if (!session) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  const { data: rolesData, error: rolesError } = await supabase
    .from("org_user_roles")
    .select("org_roles(code, name)")
    .eq("user_id", session.user.id);
  if (rolesError) throw new Error(rolesError.message);

  const orgRoles = rolesData?.map((r) => r.org_roles).filter(Boolean) || [];

  return {
    user: session.user,
    session,
    profile,
    orgRoles,
  };
};

export const useAuth = () => {
  const queryClient = useQueryClient();

  const {
    data: authData,
    isLoading: loading,
    isSuccess: rolesReady,
  } = useQuery({
    queryKey: ["session"],
    queryFn: fetchUserSession,
    staleTime: Infinity, // Session data is stable and only invalidated on auth events
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug("🔐 Auth state change:", event, session?.user?.id);
      // Invalidate the session query on any auth event
      queryClient.invalidateQueries({ queryKey: ["session"] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const hasAnyRole = (roleCodes: string[]) => {
    return rolesReady && (authData?.orgRoles.some((role) => roleCodes.includes(role.code)) ?? false);
  };

  const canAccessAdmin = hasAnyRole(["ADMIN", "WALIDATA", "KOORDINATOR", "PRODUSEN"]);
  const isAdmin = hasAnyRole(["ADMIN", "WALIDATA"]);
  const isViewer = hasAnyRole(["VIEWER"]) && !canAccessAdmin;
  const isAuthenticated = !!authData?.user;

  // Debug logging for access decisions
  if (rolesReady && authData?.user) {
    console.log("🎯 Access Decision:", {
      userId: authData.user.id,
      orgRoles: authData.orgRoles.map((r) => r.code),
      canAccessAdmin,
      isAdmin,
      isViewer,
    });
  }

  return {
    user: authData?.user ?? null,
    session: authData?.session ?? null,
    profile: authData?.profile ?? null,
    orgRoles: authData?.orgRoles ?? [],
    loading,
    rolesReady,
    canAccessAdmin,
    isAdmin,
    isViewer,
    isAuthenticated,
  };
};
