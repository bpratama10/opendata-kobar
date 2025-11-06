CREATE TYPE priority_action AS ENUM ('assign', 'claim', 'update', 'unassign');

CREATE TABLE priority_dataset_logs (
    id SERIAL PRIMARY KEY,
    priority_dataset_id UUID REFERENCES priority_datasets(id),
    action priority_action NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    org_id UUID REFERENCES org_organizations(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    notes TEXT
);

ALTER TABLE priority_dataset_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all priority dataset logs" ON priority_dataset_logs
  FOR SELECT USING (has_role('ADMIN'));

CREATE POLICY "Coordinators can view all priority dataset logs" ON priority_dataset_logs
  FOR SELECT USING (has_role('COORDINATOR'));

CREATE POLICY "Organizations can view their own priority dataset logs" ON priority_dataset_logs
  FOR SELECT USING (org_id = auth_org_id());
