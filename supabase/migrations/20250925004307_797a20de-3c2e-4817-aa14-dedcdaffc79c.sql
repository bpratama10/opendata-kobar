-- Fix security vulnerability in org_users table RLS policies
-- Current policies allow any authenticated user to see all user data

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.org_users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.org_users;

-- Create secure policies that properly restrict access

-- Only admins can view all organization users
CREATE POLICY "Admins can view all org users" 
ON public.org_users 
FOR SELECT 
USING (is_admin());

-- Only admins can update organization user data
CREATE POLICY "Admins can update org users" 
ON public.org_users 
FOR UPDATE 
USING (is_admin());

-- Only admins can insert new organization users
CREATE POLICY "Admins can insert org users" 
ON public.org_users 
FOR INSERT 
WITH CHECK (is_admin());

-- Only admins can delete organization users
CREATE POLICY "Admins can delete org users" 
ON public.org_users 
FOR DELETE 
USING (is_admin());