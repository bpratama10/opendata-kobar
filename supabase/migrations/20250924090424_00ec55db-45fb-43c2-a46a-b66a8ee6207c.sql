-- Create the missing profile for the current user
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  '3a08224e-5d70-4618-97bd-d9ae57e2f43e',
  'bpratama10@gmail.com',
  '',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role;