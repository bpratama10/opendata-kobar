-- Update the function to also check for profile role admin
CREATE OR REPLACE FUNCTION public.has_admin_or_walidata_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    -- Check for organizational roles
    EXISTS (
      SELECT 1 
      FROM public.org_user_roles ur
      JOIN public.org_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.code IN ('ADMIN', 'WALIDATA')
    )
    OR
    -- Check for profile admin role  
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );
$function$