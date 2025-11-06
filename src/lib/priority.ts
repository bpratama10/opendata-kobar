import { supabase } from '../integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import type { Json, TablesInsert, TablesUpdate } from '../integrations/supabase/types';

export type PriorityDataset = {
  id: string;
  code: string;
  name: string;
  operational_definition?: string;
  data_type?: string;
  proposing_agency?: string;
  producing_agency?: string;
  source_reference?: string;
  data_depth_level?: string;
  update_schedule?: string;
  assigned_org?: string;
  status: 'unassigned' | 'claimed' | 'assigned';
  assigned_by?: string;
  assigned_at?: string;
  claimed_by?: string;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
};

export type PriorityDatasetLog = {
  id: number;
  priority_dataset_id: string;
  action: 'assign' | 'claim' | 'update' | 'unassign';
  actor_id: string;
  org_id?: string;
  timestamp: string;
  notes?: string;
};

type CatalogMetadataInsert = TablesInsert<'catalog_metadata'>;
type CatalogMetadataUpdate = TablesUpdate<'catalog_metadata'>;

const SLUG_ATTEMPTS = 5;

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

async function generateUniquePrioritySlug(base: string): Promise<string> {
  const sanitizedBase = slugify(base || '');
  const fallback = slugify(uuidv4());
  const baseSlug = sanitizedBase || `priority-dataset-${fallback}`;
  let slugCandidate = baseSlug;

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      slugCandidate = `${baseSlug}-${attempt}`;
    }

    const { data: existing, error } = await supabase
      .from('catalog_metadata')
      .select('id')
      .eq('slug', slugCandidate)
      .maybeSingle();

    if (error) {
      console.error('Error checking slug availability for priority dataset', error);
      break;
    }

    if (!existing) {
      return slugCandidate;
    }
  }

  return `${baseSlug}-${uuidv4().slice(0, 8)}`;
}

async function ensureCatalogMetadataLink(priorityDataset: PriorityDataset, orgId: string | null) {
  try {
    const { data: existing, error } = await supabase
      .from('catalog_metadata')
      .select('id')
      .eq('priority_dataset_id', priorityDataset.id)
      .maybeSingle();

    if (error) {
      console.error('Error looking up catalog metadata for priority dataset', error);
      return;
    }

    const baseFields = priorityDataset.operational_definition ?? priorityDataset.name;
    const sharedFields: CatalogMetadataUpdate = {
      is_priority: true,
      priority_dataset_id: priorityDataset.id,
      title: priorityDataset.name,
      abstract: baseFields,
      description: baseFields,
      classification_code: 'PUBLIC',
    };

    if (existing) {
      const updatePayload: CatalogMetadataUpdate = {
        ...sharedFields,
        org_id: orgId ?? null,
        publisher_org_id: orgId ?? null,
        source_name: priorityDataset.producing_agency ?? priorityDataset.proposing_agency ?? null,
      };

      const { error: updateError } = await supabase
        .from('catalog_metadata')
        .update(updatePayload)
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating catalog metadata for priority dataset', updateError);
      }
      return;
    }

    const slug = await generateUniquePrioritySlug(priorityDataset.code || priorityDataset.name);
    const insertPayload: CatalogMetadataInsert = {
      title: priorityDataset.name,
      slug,
      abstract: baseFields,
      description: baseFields,
      classification_code: 'PUBLIC',
      org_id: orgId ?? null,
      publisher_org_id: orgId ?? null,
      contact_email: null,
      source_name: priorityDataset.producing_agency ?? priorityDataset.proposing_agency ?? null,
      publication_status: 'DRAFT',
      maintainers: [] as Json,
      keywords: [] as Json,
      custom_fields: {} as Json,
      priority_dataset_id: priorityDataset.id,
      is_priority: true,
    };

    const { error: insertError } = await supabase.from('catalog_metadata').insert(insertPayload);

    if (insertError) {
      console.error('Error creating catalog metadata for priority dataset', insertError);
    }
  } catch (catError) {
    console.error('Unexpected error ensuring catalog metadata link', catError);
  }
}

// Fetch all priority datasets
export async function getPriorityDatasets(): Promise<PriorityDataset[] | null> {
  const { data, error } = await supabase
    .from('priority_datasets')
    .select('*');
  if (error) {
    console.error('Error fetching priority datasets:', error);
    return null;
  }
  return data;
}

// Fetch a single priority dataset by ID
export async function getPriorityDatasetById(id: string): Promise<PriorityDataset | null> {
  const { data, error } = await supabase
    .from('priority_datasets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Error fetching priority dataset by ID:', error);
    return null;
  }
  return data;
}

// Create a new priority dataset (Admin/Coordinator only)
export async function createPriorityDataset(dataset: Omit<PriorityDataset, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<PriorityDataset | null> {
  const { data, error } = await supabase
    .from('priority_datasets')
    .insert({ ...dataset, id: uuidv4(), status: 'unassigned' })
    .select()
    .maybeSingle();
  if (error) {
    console.error('Error creating priority dataset:', error);
    return null;
  }
  return data;
}

// Update an existing priority dataset (Admin/Coordinator only)
export async function updatePriorityDataset(id: string, updates: Partial<Omit<PriorityDataset, 'id' | 'created_at' | 'updated_at'>>): Promise<PriorityDataset | null> {
  const { data, error } = await supabase
    .from('priority_datasets')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) {
    console.error('Error updating priority dataset:', error);
    return null;
  }

  if (data) {
    await logPriorityDatasetAction({
      priority_dataset_id: data.id,
      action: 'update',
      actor_id: updates.assigned_by ?? updates.claimed_by ?? 'system',
      org_id: data.assigned_org,
      notes: 'Priority dataset metadata updated',
    });
  }

  return data;
}

// Delete a priority dataset (Admin/Coordinator only)
export async function deletePriorityDataset(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('priority_datasets')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting priority dataset:', error);
    return false;
  }

  await logPriorityDatasetAction({
    priority_dataset_id: id,
    action: 'unassign',
    actor_id: 'system',
    notes: 'Priority dataset deleted',
  });

  return true;
}

// Assign a priority dataset to an organization (Admin/Coordinator)
export async function assignPriorityDataset(
  datasetId: string,
  orgId: string,
  assignedByUserId: string
): Promise<PriorityDataset | null> {
  const { data, error } = await supabase
    .from('priority_datasets')
    .update({
      assigned_org: orgId,
      status: 'assigned',
      assigned_by: assignedByUserId,
      assigned_at: new Date().toISOString(),
      claimed_by: null,
      claimed_at: null,
    })
    .eq('id', datasetId)
    .eq('status', 'unassigned')
    .is('assigned_org', null)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error assigning priority dataset:', error);
    return null;
  }

  if (!data) {
    console.warn('Priority dataset not eligible for assignment', datasetId);
    return null;
  }

  await ensureCatalogMetadataLink(data, orgId);

  const logResult = await logPriorityDatasetAction({
    priority_dataset_id: datasetId,
    action: 'assign',
    actor_id: assignedByUserId,
    org_id: orgId,
    notes: `Dataset assigned to organization ${orgId}`,
  });

  if (!logResult) {
    console.error('Failed to log assignment action for priority dataset', datasetId);
  }

  return data;
}

// Claim an unassigned priority dataset by a producer
export async function claimPriorityDataset(
  datasetId: string,
  producerOrgId: string,
  claimedByUserId: string
): Promise<PriorityDataset | null> {
  const { data, error } = await supabase
    .from('priority_datasets')
    .update({
      assigned_org: producerOrgId,
      status: 'claimed',
      claimed_by: claimedByUserId,
      claimed_at: new Date().toISOString(),
      assigned_by: null,
      assigned_at: null,
    })
    .eq('id', datasetId)
    .eq('status', 'unassigned')
    .is('assigned_org', null)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error claiming priority dataset:', error);
    return null;
  }

  if (!data) {
    console.warn('Priority dataset not eligible for claiming', datasetId);
    return null;
  }

  await ensureCatalogMetadataLink(data, producerOrgId);

  const logResult = await logPriorityDatasetAction({
    priority_dataset_id: datasetId,
    action: 'claim',
    actor_id: claimedByUserId,
    org_id: producerOrgId,
    notes: `Dataset claimed by producer in organization ${producerOrgId}`,
  });

  if (!logResult) {
    console.error('Failed to log claim action for priority dataset', datasetId);
  }

  return data;
}

// Log an action on a priority dataset
export async function logPriorityDatasetAction(log: Omit<PriorityDatasetLog, 'id' | 'timestamp'>): Promise<PriorityDatasetLog | null> {
  const { data, error } = await supabase
    .from('priority_dataset_logs')
    .insert(log)
    .select()
    .maybeSingle();
  if (error) {
    console.error('Error logging priority dataset action:', error);
    return null;
  }
  return data;
}

// Fetch priority dataset logs
export async function getPriorityDatasetLogs(datasetId?: string): Promise<PriorityDatasetLog[] | null> {
  let query = supabase
    .from('priority_dataset_logs')
    .select('*')
    .order('timestamp', { ascending: false });

  if (datasetId) {
    query = query.eq('priority_dataset_id', datasetId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching priority dataset logs:', error);
    return null;
  }
  return data;
}
