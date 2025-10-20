-- Add RLS policies for org_user_roles table to allow admins to manage user roles

-- Allow admins to insert user roles
CREATE POLICY "Admins can insert user roles" 
ON public.org_user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Allow admins to update user roles
CREATE POLICY "Admins can update user roles" 
ON public.org_user_roles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Allow admins to delete user roles
CREATE POLICY "Admins can delete user roles" 
ON public.org_user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);