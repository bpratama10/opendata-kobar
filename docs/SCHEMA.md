# Database Schema - Open Data Platform

## Overview

The database follows a **multi-tenant, role-based access control** architecture with comprehensive metadata cataloging. All tables use **Row-Level Security (RLS)** for authorization.

## Entity Relationship Diagram

```
┌─────────────────┐         ┌──────────────────┐
│  auth.users     │────────→│   profiles       │
│  (Supabase)     │         │                  │
└─────────────────┘         └──────────────────┘
        ↓                            ↓
        │                            │
        │                   ┌────────┴──────────┐
        │                   │  org_user_roles   │
        │                   └────────┬──────────┘
        │                            ↓
        │                   ┌────────────────────┐
        │                   │    org_roles       │
        └──────────────────→│  (RBAC Roles)      │
                            └────────────────────┘
                                     ↓
                            ┌────────────────────┐
                            │ org_organizations  │
                            └────────┬───────────┘
                                     ↓
                            ┌────────────────────┐
                            │ catalog_metadata   │◄──┐
                            │   (Datasets)       │   │
                            └────────┬───────────┘   │
                                     ↓               │
                            ┌────────────────────┐   │
                            │ catalog_resources  │   │
                            └────────┬───────────┘   │
                                     ↓               │
        ┌────────────────────────────┼───────────────┤
        ↓                            ↓               │
┌───────────────────┐    ┌───────────────────┐      │
│data_indicators    │    │catalog_distributions│     │
└────────┬──────────┘    └────────┬──────────┘      │
         ↓                        ↓                  │
┌───────────────────┐    ┌───────────────────┐      │
│  data_points      │    │telemetry_downloads│      │
└───────────────────┘    └───────────────────┘      │
                                                     │
         Tags/Themes/Classifications ───────────────┘
```

## Core Tables

### 1. catalog_metadata (Datasets)

The central table for dataset metadata.

**Columns:**
- `id` UUID PRIMARY KEY
- `title` VARCHAR NOT NULL
- `slug` VARCHAR NOT NULL UNIQUE
- `description` TEXT
- `abstract` TEXT
- `source_name` VARCHAR
- `contact_email` VARCHAR
- `language` VARCHAR DEFAULT 'id'
- `classification_code` classification_type (PUBLIC, INTERNAL, CONFIDENTIAL)
- `publication_status` publication_status (DRAFT, PENDING_REVIEW, PUBLISHED)
- `publisher_org_id` UUID → org_organizations(id)
- `org_id` UUID → org_organizations(id) (deprecated, use publisher_org_id)
- `license_code` VARCHAR → lisensi(code)
- `update_frequency_code` VARCHAR → freq_upd(code)
- `temporal_start` DATE
- `temporal_end` DATE
- `keywords` JSONB (array of strings)
- `maintainers` JSONB (array of strings) ← **Recently Added**
- `custom_fields` JSONB
- `is_published` BOOLEAN DEFAULT false (deprecated, use publication_status)
- `created_by` UUID → auth.users(id)
- `updated_by` UUID → auth.users(id)
- `created_at` TIMESTAMP WITH TIME ZONE
- `updated_at` TIMESTAMP WITH TIME ZONE
- `last_updated_display` TIMESTAMP WITH TIME ZONE
- `deleted_at` TIMESTAMP WITH TIME ZONE (soft delete)

**RLS Policies:**
- `Dataset viewing policy`: 
  - Public: publication_status = PUBLISHED AND classification_code = PUBLIC
  - Authenticated: ADMIN, WALIDATA, KOORDINATOR, or same organization
- `Dataset creation policy`: ADMIN, WALIDATA, or PRODUSEN (same org)
- `Dataset update policy`: ADMIN, WALIDATA, or PRODUSEN (same org, DRAFT/PENDING_REVIEW only)
- `Dataset deletion policy`: ADMIN, WALIDATA, or PRODUSEN (same org, DRAFT/PENDING_REVIEW only)

**Indexes:**
- `idx_catalog_metadata_slug` ON slug
- `idx_catalog_metadata_publisher_org` ON publisher_org_id
- `idx_catalog_metadata_publication_status` ON publication_status

---

### 2. catalog_resources

Resources attached to datasets (tables, files, APIs).

**Columns:**
- `id` UUID PRIMARY KEY
- `dataset_id` UUID NOT NULL → catalog_metadata(id)
- `name` VARCHAR NOT NULL
- `description` TEXT
- `resource_type` resource_type (TABLE, FILE, API, WEB)
- `schema_json` JSONB (schema definition for TABLE resources)
- `created_at` TIMESTAMP WITH TIME ZONE
- `updated_at` TIMESTAMP WITH TIME ZONE

**RLS Policies:**
- `Resource viewing policy`: Same as parent dataset viewing policy
- `Resource management policy`: Same as parent dataset update policy

**Key Pattern:**
- TABLE resources enable structured data entry via data_indicators and data_points
- FILE resources link to catalog_distributions for downloadable files

---

### 3. catalog_distributions

Physical distributions (files) of resources.

**Columns:**
- `id` UUID PRIMARY KEY
- `resource_id` UUID NOT NULL → catalog_resources(id)
- `version` VARCHAR NOT NULL
- `media_type` VARCHAR NOT NULL (MIME type)
- `storage_uri` VARCHAR (file location)
- `byte_size` BIGINT
- `checksum_sha256` CHAR(64)
- `availability` availability_type (online, offline, archived)
- `created_at` TIMESTAMP WITH TIME ZONE

**RLS Policies:**
- `Distribution viewing policy`: Same as parent resource
- `Distribution management policy`: Same as parent resource

**Usage:**
- Links to storage system (Supabase Storage or external)
- Tracks file versions
- Recorded in telemetry_downloads when accessed

---

### 4. data_indicators

Row dimensions for structured data tables.

**Columns:**
- `id` UUID PRIMARY KEY
- `resource_id` UUID NOT NULL → catalog_resources(id)
- `code` VARCHAR NOT NULL
- `label` VARCHAR NOT NULL
- `description` TEXT
- `unit` VARCHAR (e.g., "persons", "%", "USD")
- `order_no` INTEGER DEFAULT 0
- `is_active` BOOLEAN DEFAULT true
- `created_at` TIMESTAMP WITH TIME ZONE
- `updated_at` TIMESTAMP WITH TIME ZONE

**RLS Policies:**
- `Indicator viewing policy`: Same as parent dataset
- `Indicator management policy`: Same as parent dataset update

**Example:**
```json
{
  "code": "POP_TOTAL",
  "label": "Total Population",
  "unit": "persons",
  "order_no": 1
}
```

---

### 5. data_table_view_columns (Periods)

Column dimensions for structured data tables.

**Columns:**
- `id` UUID PRIMARY KEY
- `resource_id` UUID NOT NULL → catalog_resources(id)
- `time_grain` time_grain (YEAR, QUARTER, MONTH, WEEK, DAY)
- `period_start` DATE NOT NULL
- `column_label` VARCHAR NOT NULL
- `column_order` INTEGER DEFAULT 0
- `is_hidden` BOOLEAN DEFAULT false
- `created_at` TIMESTAMP WITH TIME ZONE
- `updated_at` TIMESTAMP WITH TIME ZONE

**RLS Policies:**
- `Table view columns viewing policy`: Same as parent dataset
- `Table view columns management policy`: Same as parent dataset update

**Unique Constraint:**
- `(resource_id, time_grain, period_start)`

**Example:**
```json
{
  "time_grain": "YEAR",
  "period_start": "2023-01-01",
  "column_label": "2023",
  "column_order": 1
}
```

---

### 6. data_points

Actual data values (indicator × period intersection).

**Columns:**
- `id` UUID PRIMARY KEY
- `indicator_id` UUID NOT NULL → data_indicators(id)
- `resource_id` UUID NOT NULL → catalog_resources(id)
- `time_grain` time_grain NOT NULL
- `period_start` DATE NOT NULL
- `period_label` VARCHAR NOT NULL
- `value` NUMERIC
- `qualifier` qualifier_type (OFFICIAL, PRELIMINARY, ESTIMATED, REVISED, NA)
- `distribution_id` UUID → catalog_distributions(id)
- `distribution_key` TEXT
- `top_header_value` TEXT
- `sub_header_value` TEXT
- `row_dimension_value` TEXT
- `attrs` JSONB (additional attributes)
- `created_at` TIMESTAMP WITH TIME ZONE
- `updated_at` TIMESTAMP WITH TIME ZONE

**RLS Policies:**
- `Data points viewing policy`: Same as parent dataset
- `Data points management policy`: Same as parent dataset update

**Unique Constraint:**
- `(indicator_id, resource_id, period_start)`

**Usage Pattern:**
```typescript
// Upsert data point
await supabase.from('data_points').upsert({
  indicator_id: 'uuid-1',
  resource_id: 'uuid-2',
  period_start: '2023-01-01',
  time_grain: 'YEAR',
  period_label: '2023',
  value: 1500000,
  qualifier: 'OFFICIAL'
}, {
  onConflict: 'indicator_id,resource_id,period_start'
});
```

---

## Reference Tables

### catalog_tags

**Columns:**
- `id` UUID PRIMARY KEY
- `name` VARCHAR UNIQUE NOT NULL

**RLS:** Read: public, Write: authenticated

**Junction Table:** `catalog_dataset_tags` (dataset_id, tag_id)

---

### catalog_themes

**Columns:**
- `id` UUID PRIMARY KEY
- `code` VARCHAR UNIQUE NOT NULL
- `name` VARCHAR NOT NULL

**RLS:** Read: public, Write: authenticated

**Junction Table:** `catalog_dataset_themes` (dataset_id, theme_id)

---

### catalog_data_classifications

**Columns:**
- `code` VARCHAR PRIMARY KEY (PUBLIC, INTERNAL, CONFIDENTIAL)
- `name` VARCHAR NOT NULL
- `notes` TEXT

**RLS:** Read: public

---

### lisensi (Licenses)

**Columns:**
- `code` VARCHAR PRIMARY KEY (e.g., CC-BY-4.0, CC0-1.0)
- `name` VARCHAR NOT NULL
- `url` VARCHAR
- `notes` TEXT

**RLS:** Read: public

---

### freq_upd (Update Frequencies)

**Columns:**
- `code` VARCHAR PRIMARY KEY (DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUALLY)
- `name` VARCHAR NOT NULL
- `notes` TEXT

**RLS:** Read: public

---

## Organization & User Tables

### org_organizations

**Columns:**
- `id` UUID PRIMARY KEY
- `name` VARCHAR NOT NULL
- `short_name` VARCHAR
- `org_type` org_type (GOVERNMENT, NGO, PRIVATE, ACADEMIC, INTERNATIONAL)
- `parent_id` UUID → org_organizations(id) (hierarchical structure)
- `metadata` JSONB
- `created_at` TIMESTAMP WITH TIME ZONE
- `updated_at` TIMESTAMP WITH TIME ZONE

**RLS:** Read: authenticated, Write: ADMIN

---

### org_roles

**Columns:**
- `id` UUID PRIMARY KEY
- `code` VARCHAR UNIQUE NOT NULL (ADMIN, WALIDATA, KOORDINATOR, PRODUSEN, VIEWER)
- `name` VARCHAR NOT NULL
- `created_at` TIMESTAMP WITH TIME ZONE

**RLS:** Read: public

**Role Hierarchy:**
- **ADMIN**: Full system access
- **WALIDATA**: Approve/publish datasets, manage organizations
- **KOORDINATOR**: View all datasets in organization
- **PRODUSEN**: Create/edit own organization's datasets (DRAFT/PENDING_REVIEW)
- **VIEWER**: Read-only access to internal datasets

---

### org_user_roles

**Columns:**
- `user_id` UUID NOT NULL → auth.users(id)
- `role_id` UUID NOT NULL → org_roles(id)

**Primary Key:** `(user_id, role_id)`

**RLS:** 
- Read: authenticated
- Write: ADMIN or WALIDATA (for VIEWER/PRODUSEN roles only)

---

### profiles

**Columns:**
- `id` UUID PRIMARY KEY → auth.users(id)
- `email` VARCHAR NOT NULL
- `full_name` VARCHAR
- `created_at` TIMESTAMP WITH TIME ZONE
- `updated_at` TIMESTAMP WITH TIME ZONE

**RLS:**
- Read: Own profile or ADMIN
- Update: Own profile (limited fields) or ADMIN (all fields)

**CRITICAL SECURITY NOTE:** 
- The `role` column has been **REMOVED** to prevent privilege escalation attacks
- **NEVER** store roles in this table
- **ALWAYS** use `org_user_roles` table for role management
- Client-side role checks are for UI only; RLS policies enforce actual security

---

### org_users (Alternative User Table)

**Columns:**
- `id` UUID PRIMARY KEY
- `email` VARCHAR UNIQUE NOT NULL
- `full_name` VARCHAR NOT NULL
- `org_id` UUID → org_organizations(id)
- `is_active` BOOLEAN DEFAULT true
- `attributes` JSONB
- `created_at` TIMESTAMP WITH TIME ZONE
- `updated_at` TIMESTAMP WITH TIME ZONE

**RLS:** ADMIN only

**CRITICAL SECURITY NOTE:**
- The `password_hash` column has been **REMOVED** to prevent exposure of sensitive credentials
- Standard auth uses Supabase Auth (`auth.users`) + `profiles`
- This table is for organizational user records only, not authentication

---

## Telemetry Tables

### telemetry_downloads

Tracks dataset/distribution downloads.

**Columns:**
- `id` BIGSERIAL PRIMARY KEY
- `distribution_id` UUID NOT NULL → catalog_distributions(id)
- `user_id` UUID → auth.users(id)
- `channel` download_channel (WEB, API, DIRECT)
- `client_info` JSONB (user agent, IP, etc.)
- `created_at` TIMESTAMP WITH TIME ZONE

**RLS:**
- Read: authenticated
- Write: authenticated

---

### telemetry_audit_events

Audit trail for significant actions.

**Columns:**
- `id` BIGSERIAL PRIMARY KEY
- `actor_id` UUID → auth.users(id)
- `action` VARCHAR NOT NULL (CREATE, UPDATE, DELETE, PUBLISH, etc.)
- `object_type` VARCHAR (dataset, resource, user, etc.)
- `object_id` UUID
- `context` JSONB (before/after state, reason, etc.)
- `created_at` TIMESTAMP WITH TIME ZONE

**RLS:**
- Read: authenticated
- Write: authenticated

---

## Custom Types (Enums)

### publication_status
```sql
CREATE TYPE publication_status AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED'
);
```

### classification_type
```sql
CREATE TYPE classification_type AS ENUM (
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL'
);
```

### resource_type
```sql
CREATE TYPE resource_type AS ENUM (
  'TABLE',
  'FILE',
  'API',
  'WEB'
);
```

### time_grain
```sql
CREATE TYPE time_grain AS ENUM (
  'YEAR',
  'QUARTER',
  'MONTH',
  'WEEK',
  'DAY'
);
```

### qualifier_type
```sql
CREATE TYPE qualifier_type AS ENUM (
  'OFFICIAL',
  'PRELIMINARY',
  'ESTIMATED',
  'REVISED',
  'NA'
);
```

### availability_type
```sql
CREATE TYPE availability_type AS ENUM (
  'online',
  'offline',
  'archived'
);
```

### download_channel
```sql
CREATE TYPE download_channel AS ENUM (
  'WEB',
  'API',
  'DIRECT'
);
```

### org_type
```sql
CREATE TYPE org_type AS ENUM (
  'GOVERNMENT',
  'NGO',
  'PRIVATE',
  'ACADEMIC',
  'INTERNATIONAL'
);
```

---

## Security Definer Functions

### has_role(role_code TEXT) → BOOLEAN

Checks if current user has a specific role.

```sql
CREATE FUNCTION public.has_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_user_roles ur
    JOIN org_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.code = _role
  );
$$;
```

---

### auth_org_id() → UUID

Returns current user's organization ID.

```sql
CREATE FUNCTION public.auth_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id
  FROM org_users
  WHERE id = auth.uid();
$$;
```

---

### is_admin() → BOOLEAN

Checks if current user is an admin.

```sql
CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role('ADMIN');
$$;
```

---

## Key Patterns & Best Practices

### 1. Always Use Upsert for Data Points

```typescript
// ✅ CORRECT - Upsert prevents duplicates
await supabase.from('data_points').upsert(dataPoint, {
  onConflict: 'indicator_id,resource_id,period_start'
});
```

### 2. CRITICAL: Never Store Roles in User Tables

**🚨 SECURITY WARNING:** This enables privilege escalation attacks!

```typescript
// ❌ WRONG - Allows users to escalate privileges
await supabase.from('profiles').update({ role: 'admin' });
// User can update their own profile = user becomes admin!

// ✅ CORRECT - Separate table with strict RLS
await supabase.from('org_user_roles').insert({
  user_id: userId,
  role_id: adminRoleId
});
// RLS policy prevents self-assignment
```

### 3. Always Include RLS in Queries

RLS is enforced server-side, but understanding the policy helps:

```typescript
// Query automatically filtered by RLS
const { data } = await supabase
  .from('catalog_metadata')
  .select('*');
// Returns only datasets user can access
```

### 4. Use Soft Deletes for Audit Trail

```typescript
// Soft delete
await supabase
  .from('catalog_metadata')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', datasetId);

// Query excludes soft-deleted
await supabase
  .from('catalog_metadata')
  .select('*')
  .is('deleted_at', null);
```

---

## Migration Strategy

1. **Schema Changes**: Always use Supabase migrations
2. **Data Migration**: Write SQL scripts for data transformations
3. **RLS Updates**: Test with different user roles before deploying
4. **Type Generation**: Run `supabase gen types typescript` after migrations

---

## Future Schema Enhancements

- Add `spatial_id` UUID to `data_points` for geographic dimensions
- Add `sex_code` TEXT to `data_points` for demographic disaggregation
- Create composite unique index: `(indicator_id, resource_id, period_start, spatial_id, sex_code)`
- Add `use_sub_headers` BOOLEAN to `catalog_resources` for hierarchical columns
