CREATE TYPE dataset_status AS ENUM ('unassigned', 'claimed', 'assigned');

CREATE TABLE priority_datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR NOT NULL,
    name TEXT NOT NULL,
    operational_definition TEXT,
    data_type VARCHAR,
    proposing_agency VARCHAR,
    producing_agency VARCHAR,
    source_reference TEXT,
    data_depth_level VARCHAR,
    update_schedule VARCHAR,
    assigned_org UUID REFERENCES org_organizations(id),
    status dataset_status DEFAULT 'unassigned' NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    claimed_by UUID REFERENCES auth.users(id),
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE priority_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for unassigned datasets" ON priority_datasets
  FOR SELECT USING (status = 'unassigned');

CREATE POLICY "Organizations can view their assigned/claimed datasets" ON priority_datasets
  FOR SELECT USING (assigned_org = auth_org_id());

CREATE POLICY "Admins can manage all priority datasets" ON priority_datasets
  FOR ALL USING (has_role('ADMIN')) WITH CHECK (has_role('ADMIN'));

CREATE POLICY "Coordinators can manage all priority datasets" ON priority_datasets
  FOR ALL USING (has_role('KOORDINATOR')) WITH CHECK (has_role('KOORDINATOR'));

CREATE POLICY "Producers can claim unassigned datasets" ON priority_datasets
  FOR UPDATE USING (status = 'unassigned' AND assigned_org IS NULL AND has_role('PRODUCER')) WITH CHECK (status = 'claimed' AND assigned_org = auth_org_id());

-- Enable automatic update of 'updated_at' column
CREATE FUNCTION update_priority_datasets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_priority_datasets_updated_at_trigger
BEFORE UPDATE ON priority_datasets
FOR EACH ROW EXECUTE FUNCTION update_priority_datasets_updated_at();
