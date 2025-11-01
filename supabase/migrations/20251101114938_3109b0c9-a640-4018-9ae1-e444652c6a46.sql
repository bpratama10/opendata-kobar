-- Allow users to view their own org_users record
CREATE POLICY "Users can view their own org record"
ON public.org_users
FOR SELECT
TO authenticated
USING (auth.uid() = id);