# API Contracts - Open Data Platform

## Overview

This document describes the data contracts between the frontend and Supabase backend. All API interactions use the **Supabase JavaScript Client** with automatic type safety from generated TypeScript types.

**Base Pattern:**
```typescript
import { supabase } from '@/integrations/supabase/client';

// Query
const { data, error } = await supabase
  .from('table_name')
  .select('columns')
  .eq('column', 'value');

// Mutation
const { data, error } = await supabase
  .from('table_name')
  .insert({ ...payload });
```

---

## Public Endpoints (No Auth Required)

### 1. List Public Datasets

**Query:**
```typescript
const { data, error } = await supabase
  .from('catalog_metadata')
  .select(`
    id,
    slug,
    title,
    description,
    source_name,
    contact_email,
    language,
    classification_code,
    publication_status,
    last_updated_display,
    catalog_dataset_tags (
      catalog_tags (
        id,
        name
      )
    ),
    catalog_dataset_themes (
      catalog_themes (
        id,
        code,
        name
      )
    )
  `)
  .eq('publication_status', 'PUBLISHED')
  .eq('classification_code', 'PUBLIC')
  .is('deleted_at', null)
  .order('last_updated_display', { ascending: false });
```

**Response Shape:**
```typescript
interface PublicDataset {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  source_name: string | null;
  contact_email: string | null;
  language: string;
  classification_code: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  publication_status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED';
  last_updated_display: string; // ISO 8601
  catalog_dataset_tags: {
    catalog_tags: {
      id: string;
      name: string;
    }
  }[];
  catalog_dataset_themes: {
    catalog_themes: {
      id: string;
      code: string;
      name: string;
    }
  }[];
}
```

---

### 2. Get Dataset by Slug

**Query:**
```typescript
const { data, error } = await supabase
  .from('catalog_metadata')
  .select(`
    *,
    catalog_dataset_tags (
      catalog_tags (
        id,
        name
      )
    ),
    catalog_dataset_themes (
      catalog_themes (
        id,
        code,
        name
      )
    ),
    catalog_resources (
      id,
      name,
      description,
      resource_type
    )
  `)
  .eq('slug', slug)
  .eq('publication_status', 'PUBLISHED')
  .eq('classification_code', 'PUBLIC')
  .is('deleted_at', null)
  .single();
```

**Response:** Single `PublicDataset` object with resources array

---

### 3. List Tags

**Query:**
```typescript
const { data, error } = await supabase
  .from('catalog_tags')
  .select('id, name')
  .order('name');
```

**Response:**
```typescript
interface Tag {
  id: string;
  name: string;
}
```

---

### 4. List Themes

**Query:**
```typescript
const { data, error } = await supabase
  .from('catalog_themes')
  .select('id, code, name')
  .order('name');
```

**Response:**
```typescript
interface Theme {
  id: string;
  code: string;
  name: string;
}
```

---

## Authentication Endpoints

### 1. Sign In

**Request:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

**Response:**
```typescript
interface AuthResponse {
  data: {
    user: {
      id: string;
      email: string;
      created_at: string;
    } | null;
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      expires_in: number;
      token_type: 'bearer';
      user: User;
    } | null;
  };
  error: AuthError | null;
}
```

---

### 2. Sign Out

**Request:**
```typescript
const { error } = await supabase.auth.signOut();
```

---

### 3. Get Current User

**Request:**
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
```

---

### 4. Get User Profile

**Query:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**Response:**
```typescript
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}
```

**IMPORTANT:** The `role` field has been removed from profiles for security. Always use `org_user_roles` to check user roles.

---

### 5. Get User Roles

**Query:**
```typescript
const { data, error } = await supabase
  .from('org_user_roles')
  .select(`
    user_id,
    org_roles (
      id,
      code,
      name
    )
  `)
  .eq('user_id', userId);
```

**Response:**
```typescript
interface UserRole {
  user_id: string;
  org_roles: {
    id: string;
    code: 'ADMIN' | 'WALIDATA' | 'KOORDINATOR' | 'PRODUSEN' | 'VIEWER';
    name: string;
  };
}
```

---

## Dataset Management (Authenticated)

### 1. List User's Datasets

**Query:**
```typescript
const { data, error } = await supabase
  .from('catalog_metadata')
  .select(`
    id,
    slug,
    title,
    description,
    publication_status,
    classification_code,
    publisher_org_id,
    created_at,
    updated_at,
    catalog_dataset_tags (
      catalog_tags (
        name
      )
    ),
    catalog_dataset_themes (
      catalog_themes (
        name
      )
    )
  `)
  .is('deleted_at', null)
  .order('updated_at', { ascending: false });
// RLS automatically filters by user's access
```

---

### 2. Create Dataset

**Request:**
```typescript
const { data, error } = await supabase
  .from('catalog_metadata')
  .insert({
    title: 'Population Statistics 2024',
    slug: 'population-statistics-2024',
    description: 'Annual population data by region',
    abstract: 'Comprehensive population statistics...',
    source_name: 'National Statistics Agency',
    contact_email: 'data@stats.gov',
    language: 'id',
    classification_code: 'PUBLIC',
    publication_status: 'DRAFT',
    publisher_org_id: 'org-uuid',
    license_code: 'CC-BY-4.0',
    update_frequency_code: 'ANNUALLY',
    temporal_start: '2024-01-01',
    temporal_end: '2024-12-31',
    keywords: ['population', 'statistics', 'demographics'],
    maintainers: ['Bidang Statistik', 'Bidang TI'],
    created_by: userId
  })
  .select()
  .single();
```

**Response:**
```typescript
interface Dataset {
  id: string;
  title: string;
  slug: string;
  // ... all catalog_metadata fields
}
```

---

### 3. Update Dataset

**Request:**
```typescript
const { data, error } = await supabase
  .from('catalog_metadata')
  .update({
    title: 'Updated Title',
    description: 'Updated description',
    updated_by: userId
  })
  .eq('id', datasetId)
  .select()
  .single();
```

---

### 4. Delete Dataset (Soft Delete)

**Request:**
```typescript
const { data, error } = await supabase
  .from('catalog_metadata')
  .update({
    deleted_at: new Date().toISOString(),
    updated_by: userId
  })
  .eq('id', datasetId);
```

---

### 5. Add Tags to Dataset

**Request:**
```typescript
// First, ensure tags exist
const { data: tagData } = await supabase
  .from('catalog_tags')
  .select('id')
  .eq('name', tagName)
  .single();

// Then, link to dataset
const { data, error } = await supabase
  .from('catalog_dataset_tags')
  .insert({
    dataset_id: datasetId,
    tag_id: tagData.id
  });
```

---

### 6. Add Themes to Dataset

**Request:**
```typescript
const { data, error } = await supabase
  .from('catalog_dataset_themes')
  .insert({
    dataset_id: datasetId,
    theme_id: themeId
  });
```

---

## Resource Management

### 1. List Resources for Dataset

**Query:**
```typescript
const { data, error } = await supabase
  .from('catalog_resources')
  .select('*')
  .eq('dataset_id', datasetId)
  .order('created_at', { ascending: false });
```

**Response:**
```typescript
interface Resource {
  id: string;
  dataset_id: string;
  name: string;
  description: string | null;
  resource_type: 'TABLE' | 'FILE' | 'API' | 'WEB';
  schema_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

---

### 2. Create Resource

**Request:**
```typescript
const { data, error } = await supabase
  .from('catalog_resources')
  .insert({
    dataset_id: datasetId,
    name: 'Population Data Table',
    description: 'Structured population data',
    resource_type: 'TABLE',
    schema_json: {}
  })
  .select()
  .single();
```

---

### 3. Get or Create TABLE Resource

**Pattern:**
```typescript
// Try to get existing TABLE resource
let { data: resources } = await supabase
  .from('catalog_resources')
  .select('*')
  .eq('dataset_id', datasetId)
  .eq('resource_type', 'TABLE');

let tableResource = resources?.[0];

// Create if doesn't exist
if (!tableResource) {
  const { data: newResource } = await supabase
    .from('catalog_resources')
    .insert({
      dataset_id: datasetId,
      name: `${datasetTitle} - Data Table`,
      resource_type: 'TABLE',
      description: 'Data table for structured indicators'
    })
    .select()
    .single();
  
  tableResource = newResource;
}
```

---

## Data Tables (Indicators, Periods, Data Points)

### 1. List Indicators

**Query:**
```typescript
const { data, error } = await supabase
  .from('data_indicators')
  .select('*')
  .eq('resource_id', resourceId)
  .eq('is_active', true)
  .order('order_no');
```

**Response:**
```typescript
interface Indicator {
  id: string;
  resource_id: string;
  code: string;
  label: string;
  description: string | null;
  unit: string | null;
  order_no: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

### 2. Create Indicator

**Request:**
```typescript
const { data, error } = await supabase
  .from('data_indicators')
  .insert({
    resource_id: resourceId,
    code: 'POP_TOTAL',
    label: 'Total Population',
    description: 'Total population count',
    unit: 'persons',
    order_no: 1,
    is_active: true
  })
  .select()
  .single();
```

---

### 3. Update Indicator

**Request:**
```typescript
const { data, error } = await supabase
  .from('data_indicators')
  .update({
    label: 'Updated Label',
    unit: 'updated unit'
  })
  .eq('id', indicatorId)
  .select()
  .single();
```

---

### 4. Delete Indicator (Soft)

**Request:**
```typescript
const { data, error } = await supabase
  .from('data_indicators')
  .update({ is_active: false })
  .eq('id', indicatorId);
```

---

### 5. List Periods (Table Columns)

**Query:**
```typescript
const { data, error } = await supabase
  .from('data_table_view_columns')
  .select('*')
  .eq('resource_id', resourceId)
  .eq('is_hidden', false)
  .order('column_order');
```

**Response:**
```typescript
interface TableColumn {
  id: string;
  resource_id: string;
  time_grain: 'YEAR' | 'QUARTER' | 'MONTH' | 'WEEK' | 'DAY';
  period_start: string; // Date string (YYYY-MM-DD)
  column_label: string;
  column_order: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}
```

---

### 6. Create Period

**Request:**
```typescript
const { data, error } = await supabase
  .from('data_table_view_columns')
  .insert({
    resource_id: resourceId,
    time_grain: 'YEAR',
    period_start: '2023-01-01',
    column_label: '2023',
    column_order: 1,
    is_hidden: false
  })
  .select()
  .single();
```

---

### 7. Reorder Periods

**Request:**
```typescript
const updates = periodIds.map((id, index) => ({
  id,
  column_order: index
}));

const { data, error } = await supabase
  .from('data_table_view_columns')
  .upsert(updates);
```

---

### 8. List Data Points

**Query:**
```typescript
const { data, error } = await supabase
  .from('data_points')
  .select('*')
  .eq('resource_id', resourceId)
  .order('period_start', { ascending: true });
```

**Response:**
```typescript
interface DataPoint {
  id: string;
  indicator_id: string;
  resource_id: string;
  time_grain: 'YEAR' | 'QUARTER' | 'MONTH' | 'WEEK' | 'DAY';
  period_start: string;
  period_label: string;
  value: number | null;
  qualifier: 'OFFICIAL' | 'PRELIMINARY' | 'ESTIMATED' | 'REVISED' | 'NA';
  distribution_id: string | null;
  distribution_key: string | null;
  top_header_value: string | null;
  sub_header_value: string | null;
  row_dimension_value: string | null;
  attrs: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

---

### 9. Upsert Data Point

**Request:**
```typescript
const { data, error } = await supabase
  .from('data_points')
  .upsert({
    indicator_id: 'indicator-uuid',
    resource_id: 'resource-uuid',
    time_grain: 'YEAR',
    period_start: '2023-01-01',
    period_label: '2023',
    value: 1500000,
    qualifier: value ? 'OFFICIAL' : 'NA'
  }, {
    onConflict: 'indicator_id,resource_id,period_start'
  })
  .select()
  .single();
```

**Important:**
- Always use `upsert` with `onConflict` to prevent duplicates
- Set `qualifier` to 'NA' when value is null
- Never send `qualifier: null` (causes validation error)

---

### 10. Bulk Upsert Data Points

**Request:**
```typescript
const dataPoints = [
  {
    indicator_id: 'ind-1',
    resource_id: resourceId,
    period_start: '2023-01-01',
    time_grain: 'YEAR',
    period_label: '2023',
    value: 1500000,
    qualifier: 'OFFICIAL'
  },
  {
    indicator_id: 'ind-2',
    resource_id: resourceId,
    period_start: '2023-01-01',
    time_grain: 'YEAR',
    period_label: '2023',
    value: 2000000,
    qualifier: 'OFFICIAL'
  }
];

const { data, error } = await supabase
  .from('data_points')
  .upsert(dataPoints, {
    onConflict: 'indicator_id,resource_id,period_start'
  });
```

---

### 11. Delete Data Point

**Request:**
```typescript
const { data, error } = await supabase
  .from('data_points')
  .delete()
  .eq('id', dataPointId);
```

---

## User Management (Admin Only)

### 1. List Users

**Query:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select(`
    id,
    email,
    full_name,
    created_at,
    updated_at
  `)
  .order('created_at', { ascending: false });
```

---

### 2. Update User

**Request:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'Updated Name'
  })
  .eq('id', userId)
  .select()
  .single();
```

---

### 3. Assign Role to User

**Request:**
```typescript
const { data, error } = await supabase
  .from('org_user_roles')
  .insert({
    user_id: userId,
    role_id: roleId
  });
```

---

### 4. Remove Role from User

**Request:**
```typescript
const { data, error } = await supabase
  .from('org_user_roles')
  .delete()
  .eq('user_id', userId)
  .eq('role_id', roleId);
```

---

## Organization Management

### 1. List Organizations

**Query:**
```typescript
const { data, error } = await supabase
  .from('org_organizations')
  .select('*')
  .order('name');
```

**Response:**
```typescript
interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  org_type: 'GOVERNMENT' | 'NGO' | 'PRIVATE' | 'ACADEMIC' | 'INTERNATIONAL';
  parent_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

---

### 2. Create Organization

**Request:**
```typescript
const { data, error } = await supabase
  .from('org_organizations')
  .insert({
    name: 'Ministry of Data',
    short_name: 'MOD',
    org_type: 'GOVERNMENT',
    parent_id: null,
    metadata: {}
  })
  .select()
  .single();
```

---

## Telemetry

### 1. Log Download

**Request:**
```typescript
const { data, error } = await supabase
  .from('telemetry_downloads')
  .insert({
    distribution_id: distributionId,
    user_id: userId, // null for anonymous
    channel: 'WEB',
    client_info: {
      userAgent: navigator.userAgent,
      referrer: document.referrer
    }
  });
```

---

### 2. Log Audit Event

**Request:**
```typescript
const { data, error } = await supabase
  .from('telemetry_audit_events')
  .insert({
    actor_id: userId,
    action: 'PUBLISH',
    object_type: 'dataset',
    object_id: datasetId,
    context: {
      previous_status: 'PENDING_REVIEW',
      new_status: 'PUBLISHED',
      reason: 'Approved by WALIDATA'
    }
  });
```

---

## Error Handling

### Standard Error Response

```typescript
interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}
```

### Common Error Codes

- `42501`: Insufficient privilege (RLS denied)
- `23505`: Unique violation (duplicate key)
- `23503`: Foreign key violation
- `PGRST116`: Row not found (single() query)
- `PGRST204`: No rows returned

### Error Handling Pattern

```typescript
const { data, error } = await supabase
  .from('catalog_metadata')
  .insert(dataset);

if (error) {
  if (error.code === '23505') {
    toast.error('Dataset with this slug already exists');
  } else if (error.code === '42501') {
    toast.error('You do not have permission to create datasets');
  } else {
    toast.error(`Error: ${error.message}`);
  }
  return;
}

// Success
toast.success('Dataset created successfully');
```

---

## Best Practices

1. **Always use TypeScript types** from generated `src/integrations/supabase/types.ts`
2. **Check for errors** after every query/mutation
3. **Use upsert** for idempotent operations (data points)
4. **Never send null qualifiers** - use 'NA' instead
5. **Soft delete** records instead of hard delete when audit trail is needed
6. **Batch operations** when possible (bulk upsert)
7. **Test RLS policies** with different user roles
8. **Log significant actions** to telemetry_audit_events
9. **Invalidate TanStack Query cache** after mutations
10. **Use optimistic updates** for better UX
