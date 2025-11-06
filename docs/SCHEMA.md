# Database Schema Documentation

**Last Updated:** 2025-01-20

This document provides a comprehensive overview of the Supabase database schema for the Open Data Kobar platform. The schema is designed to manage open data catalogs, user organizations, data resources, priority datasets, and telemetry tracking.

## Overview

The database consists of several key domains:
- **Organization & User Management** (`org_*` tables)
- **Data Catalog** (`catalog_*` tables)
- **Priority Data Management** (`priority_*` tables)
- **Data Resources & Indicators** (`data_*` tables)
- **Reference Data** (licenses, frequencies, classifications, etc.)
- **Telemetry & Audit** (`telemetry_*` tables)
- **Access Control** (API keys, policies, roles, permissions)

## Core Tables

### Organization & User Management

#### `org_organizations`
Represents organizations that can publish or consume data.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `name` (VARCHAR(200), NOT NULL) - Full organization name
- `short_name` (VARCHAR(50)) - Abbreviated name
- `org_type` (org_type ENUM, NOT NULL) - Type of organization
- `parent_id` (UUID) - Parent organization for hierarchical structure
- `metadata` (JSONB) - Additional organization metadata
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- Self-referencing: `parent_id` → `org_organizations.id`
- Referenced by: `org_users.org_id`, `catalog_metadata.org_id`, `catalog_metadata.publisher_org_id`, `priority_datasets.assigned_org`

**Indexes:**
- `idx_org_organizations_name`
- `idx_org_organizations_org_type`
- `idx_org_organizations_parent_id`

#### `org_users`
Users within the system, linked to organizations.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier (matches Supabase Auth)
- `email` (VARCHAR(255), UNIQUE, NOT NULL) - User email
- `full_name` (VARCHAR(150), NOT NULL) - User's full name
- `org_id` (UUID) - Associated organization
- `is_active` (BOOLEAN, DEFAULT true) - Account status
- `attributes` (JSONB) - Additional user attributes
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- `org_id` → `org_organizations.id`
- Referenced by: `catalog_metadata.created_by`, `catalog_metadata.updated_by`, `telemetry_audit_events.actor_id`, `telemetry_downloads.user_id`, `priority_datasets.assigned_by`, `priority_datasets.claimed_by`

**Indexes:**
- `idx_org_users_org_id`
- `idx_org_users_is_active`

**RLS Policies:**
- Admins can view all org users
- Users can view their own org record
- Only admins can insert/update/delete

#### `org_roles`
System roles for access control.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `code` (VARCHAR(40), UNIQUE, NOT NULL) - Role code
- `name` (VARCHAR(100), NOT NULL) - Human-readable role name
- `created_at` (TIMESTAMP) - Creation timestamp

**Standard Roles:**
- `ADMIN` - Full system access
- `WALIDATA` - Data governance and validation
- `KOORDINATOR` - Cross-organization coordination
- `PRODUSEN` - Data producer/publisher
- `VIEWER` - Read-only access

**Relationships:**
- Referenced by: `org_user_roles.role_id`

**RLS Policies:**
- Anyone can read roles (public reference data)

#### `org_user_roles`
Many-to-many relationship between users and roles.

**Columns:**
- `user_id` (UUID, NOT NULL) - User identifier
- `role_id` (UUID, NOT NULL) - Role identifier

**Relationships:**
- `user_id` → `org_users.id`
- `role_id` → `org_roles.id`

**Constraints:**
- Primary Key: `(user_id, role_id)`

**Indexes:**
- `idx_org_user_roles_role_id`

**RLS Policies:**
- Authenticated users can view user roles
- Role-based user role management:
  - ADMIN can assign any role
  - WALIDATA can only assign VIEWER and PRODUSEN roles

#### `profiles`
Legacy user profile table (synced with auth.users).

**Columns:**
- `id` (UUID, Primary Key) - User identifier (matches auth.users.id)
- `email` (VARCHAR(255), NOT NULL) - User email
- `full_name` (VARCHAR(255)) - User full name
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Note:** The `role` column has been **REMOVED** for security. Roles are now exclusively managed via `org_user_roles`.

**RLS Policies:**
- Users can view their own profile
- Admins can view all profiles
- Users can update their own profile safely (excluding role)
- Admins can update any profile

### Data Catalog

#### `catalog_metadata`
Core dataset metadata table containing all information about datasets.

**Columns:**
- `id` (UUID, Primary Key) - Unique dataset identifier
- `org_id` (UUID) - Organization that owns the dataset
- `title` (VARCHAR(300), NOT NULL) - Dataset title
- `slug` (VARCHAR(320), UNIQUE, NOT NULL) - URL-friendly identifier
- `abstract` (TEXT) - Brief dataset description
- `description` (TEXT) - Detailed dataset description
- `last_updated_display` (TIMESTAMP) - Display date for last update
- `source_name` (VARCHAR(200)) - Data source name
- `publisher_org_id` (UUID) - Organization publishing the dataset
- `maintainers` (JSONB, DEFAULT []) - List of dataset maintainers
- `contact_email` (VARCHAR(255)) - Contact email for the dataset
- `classification_code` (classification_type ENUM) - Data classification level
- `language` (VARCHAR(10), DEFAULT 'id') - Dataset language
- `license_code` (VARCHAR(40)) - License identifier
- `update_frequency_code` (VARCHAR(20)) - Update frequency code
- `temporal_start` (DATE) - Start date of data coverage
- `temporal_end` (DATE) - End date of data coverage
- `is_published` (BOOLEAN, DEFAULT false) - Legacy publication flag
- `publication_status` (publication_status ENUM, DEFAULT 'DRAFT') - Current publication status
- `keywords` (JSONB, DEFAULT []) - Dataset keywords/tags
- `custom_fields` (JSONB, DEFAULT {}) - Additional custom metadata
- `is_priority` (BOOLEAN, DEFAULT false) - Marks dataset as priority data
- `priority_dataset_id` (UUID) - Link to priority_datasets table
- `sync_lock` (BOOLEAN, DEFAULT false) - Prevents concurrent edits
- `created_by` (UUID) - User who created the dataset
- `updated_by` (UUID) - User who last updated the dataset
- `unpublish_request_reason` (TEXT) - Reason for unpublish requests
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp
- `deleted_at` (TIMESTAMP) - Soft delete timestamp

**Relationships:**
- `org_id` → `org_organizations.id`
- `publisher_org_id` → `org_organizations.id`
- `created_by` → `org_users.id`
- `updated_by` → `org_users.id`
- `license_code` → `lisensi.code`
- `update_frequency_code` → `freq_upd.code`
- `priority_dataset_id` → `priority_datasets.id`
- Referenced by: `catalog_resources.dataset_id`, `catalog_dataset_tags.dataset_id`, `catalog_dataset_themes.dataset_id`, `catalog_dataset_spatial_coverage.dataset_id`, `gov_dataset_policies.dataset_id`, `telemetry_views.dataset_id`

**Indexes:**
- `idx_catalog_metadata_org_id`
- `idx_catalog_metadata_classification`
- `idx_catalog_metadata_published`
- `idx_catalog_metadata_temporal`
- `idx_catalog_metadata_created_at`
- `idx_catalog_metadata_priority_dataset_id`
- Full-text search: `idx_catalog_metadata_fulltext`

**RLS Policies:**
- **Dataset viewing policy**: Public can view published public datasets; authenticated users can view their org's datasets or if ADMIN/WALIDATA/KOORDINATOR
- **Dataset creation policy**: ADMIN, WALIDATA, or PRODUSEN (for own org) can create
- **Dataset update policy**: ADMIN, WALIDATA, or PRODUSEN (for own org, DRAFT/PENDING_REVIEW only) can update
- **Dataset deletion policy**: ADMIN, WALIDATA, or PRODUSEN (for own org, DRAFT/PENDING_REVIEW only) can delete
- **PRODUSEN can request unpublish**: For their published datasets

#### `catalog_resources`
Represents different resources (tables, files, APIs) within a dataset.

**Columns:**
- `id` (UUID, Primary Key) - Unique resource identifier
- `dataset_id` (UUID, NOT NULL) - Parent dataset
- `name` (VARCHAR(200), NOT NULL) - Resource name
- `resource_type` (resource_type ENUM, NOT NULL) - Type of resource
- `indicator_title` (TEXT) - Human-friendly title for the primary indicator
- `unit` (TEXT) - Standardized measurement unit
- `frequency` (TEXT) - Update cadence descriptor
- `aggregation_method` (TEXT) - How yearly totals are aggregated
- `time_dimension` (TEXT, DEFAULT 'year') - Canonical time axis label
- `chart_type` (TEXT) - Preferred chart type (line, area, slope, kpi, bar, table)
- `interpretation` (TEXT) - Human-readable insight
- `is_timeseries` (BOOLEAN, DEFAULT false) - Signals temporal trend visualization
- `schema_json` (JSONB, DEFAULT {}) - Schema definition for structured data
- `description` (TEXT) - Resource description
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- `dataset_id` → `catalog_metadata.id`
- Referenced by: `catalog_distributions.resource_id`, `data_indicators.resource_id`, `data_points.resource_id`, `data_table_view_columns.resource_id`

**RLS Policies:**
- **Resource viewing policy**: Can view if can view parent dataset
- **Resource management policy**: Can manage if can manage parent dataset

#### `catalog_distributions`
File distributions or access points for resources.

**Columns:**
- `id` (UUID, Primary Key) - Unique distribution identifier
- `resource_id` (UUID, NOT NULL) - Parent resource
- `version` (VARCHAR(60), NOT NULL) - Distribution version
- `media_type` (VARCHAR(100), NOT NULL) - MIME type
- `byte_size` (BIGINT) - File size in bytes
- `checksum_sha256` (CHAR(64)) - SHA256 checksum
- `storage_uri` (VARCHAR(1024)) - Storage location URL
- `availability` (availability_type ENUM, DEFAULT 'online') - Availability status
- `created_at` (TIMESTAMP) - Creation timestamp

**Relationships:**
- `resource_id` → `catalog_resources.id`
- Referenced by: `data_points.distribution_id`, `telemetry_downloads.distribution_id`

**RLS Policies:**
- **Distribution viewing policy**: Can view if can view parent resource
- **Distribution management policy**: Can manage if can manage parent resource

### Priority Data Management

#### `priority_datasets`
Central government priority datasets that need to be assigned to organizations.

**Columns:**
- `id` (UUID, Primary Key) - Unique priority dataset identifier
- `code` (VARCHAR, NOT NULL) - Dataset code/number
- `name` (TEXT, NOT NULL) - Dataset name
- `operational_definition` (TEXT) - Detailed operational definition
- `data_type` (VARCHAR) - Type of data
- `proposing_agency` (VARCHAR) - Agency that proposed the dataset
- `producing_agency` (VARCHAR) - Agency responsible for producing data
- `source_reference` (TEXT) - Reference to data source
- `data_depth_level` (VARCHAR) - Level of data granularity
- `update_schedule` (VARCHAR) - How often data should be updated
- `status` (dataset_status ENUM, DEFAULT 'unassigned') - Current assignment status
- `assigned_org` (UUID) - Organization assigned to produce this data
- `assigned_by` (UUID) - User who assigned the dataset
- `assigned_at` (TIMESTAMP) - When assignment was made
- `claimed_by` (UUID) - User who claimed the dataset (legacy)
- `claimed_at` (TIMESTAMP) - When dataset was claimed (legacy)
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- `assigned_org` → `org_organizations.id`
- `assigned_by` → `org_users.id`
- `claimed_by` → `org_users.id`
- Referenced by: `catalog_metadata.priority_dataset_id`, `priority_dataset_logs.priority_dataset_id`

**Indexes:**
- `idx_priority_datasets_status`
- `idx_priority_datasets_assigned_org`
- `idx_priority_datasets_code`

**RLS Policies:**
- **Admins can manage all priority datasets**: ADMIN role has full access
- **Coordinators can manage all priority datasets**: KOORDINATOR role has full access
- **Organizations can view their assigned/claimed datasets**: Users can view datasets assigned to their org
- **Public access for unassigned datasets**: Anyone can view unassigned datasets

#### `priority_dataset_logs`
Audit log for priority dataset actions.

**Columns:**
- `id` (INTEGER, Primary Key) - Sequential log identifier
- `priority_dataset_id` (UUID) - Associated priority dataset
- `action` (priority_action ENUM, NOT NULL) - Action performed
- `actor_id` (UUID) - User who performed the action
- `org_id` (UUID) - Organization context
- `notes` (TEXT) - Additional notes about the action
- `timestamp` (TIMESTAMP, DEFAULT now()) - When action occurred

**Relationships:**
- `priority_dataset_id` → `priority_datasets.id`
- `actor_id` → `org_users.id`
- `org_id` → `org_organizations.id`

**RLS Policies:**
- **Admins can view all priority dataset logs**: ADMIN role
- **Coordinators can view all priority dataset logs**: KOORDINATOR role
- **Organizations can view their own priority dataset logs**: Filtered by org_id

### Data Resources & Indicators

#### `data_indicators`
Defines indicators/metrics within a data resource.

**Columns:**
- `id` (UUID, Primary Key) - Unique indicator identifier
- `resource_id` (UUID, NOT NULL) - Parent resource
- `code` (VARCHAR(80), NOT NULL) - Indicator code
- `label` (VARCHAR(255), NOT NULL) - Human-readable label
- `unit` (VARCHAR(40)) - Measurement unit
- `description` (TEXT) - Indicator description
- `order_no` (INTEGER, DEFAULT 0) - Display order
- `is_active` (BOOLEAN, DEFAULT true) - Active status
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- `resource_id` → `catalog_resources.id`
- Referenced by: `data_points.indicator_id`

**Constraints:**
- Unique: `(resource_id, code)`

**RLS Policies:**
- **Indicator viewing policy**: Can view if can view parent resource
- **Indicator management policy**: Can manage if can manage parent resource

#### `data_points`
Actual data values for indicators at specific time periods.

**Columns:**
- `id` (UUID, Primary Key) - Unique data point identifier
- `indicator_id` (UUID, NOT NULL) - Associated indicator
- `resource_id` (UUID, NOT NULL) - Parent resource
- `time_grain` (time_grain_type ENUM, NOT NULL) - Time granularity
- `period_start` (DATE, NOT NULL) - Start date of period
- `period_label` (VARCHAR(20), NOT NULL) - Human-readable period label
- `value` (NUMERIC(20,4)) - Data value
- `qualifier` (qualifier_type ENUM, DEFAULT 'OFFICIAL') - Data quality qualifier
- `distribution_id` (UUID) - Associated distribution
- `distribution_key` (TEXT) - Distribution-specific key
- `attrs` (JSONB) - Additional attributes
- `row_dimension_value` (TEXT) - Row dimension value
- `sub_header_value` (TEXT) - Sub-header value
- `top_header_value` (TEXT) - Top header value
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- `indicator_id` → `data_indicators.id`
- `resource_id` → `catalog_resources.id`
- `distribution_id` → `catalog_distributions.id`

**Constraints:**
- Unique: `(indicator_id, period_start, resource_id)`

**RLS Policies:**
- **Data points viewing policy**: Can view if can view parent resource
- **Data points management policy**: Can manage if can manage parent resource

#### `data_table_view_columns`
Configuration for table view column display.

**Columns:**
- `id` (UUID, Primary Key) - Unique configuration identifier
- `resource_id` (UUID, NOT NULL) - Parent resource
- `time_grain` (time_grain_type ENUM, NOT NULL) - Time granularity
- `period_start` (DATE, NOT NULL) - Period start date
- `column_label` (VARCHAR(20), NOT NULL) - Column display label
- `is_hidden` (BOOLEAN, DEFAULT false) - Visibility flag
- `column_order` (INTEGER, DEFAULT 0) - Display order
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- `resource_id` → `catalog_resources.id`

**Constraints:**
- Unique: `(resource_id, period_start)`

**RLS Policies:**
- **Table view columns viewing policy**: Can view if can view parent resource
- **Table view columns management policy**: Can manage if can manage parent resource

### Reference Data

#### `lisensi`
License definitions for datasets.

**Columns:**
- `code` (VARCHAR(40), Primary Key) - License code
- `name` (VARCHAR(120), NOT NULL) - License name
- `url` (VARCHAR(255)) - License URL
- `notes` (TEXT) - Additional notes

**RLS Policies:**
- Anyone can read licenses (public reference data)

#### `freq_upd`
Update frequency definitions.

**Columns:**
- `code` (VARCHAR(20), Primary Key) - Frequency code
- `name` (VARCHAR(40), NOT NULL) - Frequency name
- `notes` (TEXT) - Additional notes

**RLS Policies:**
- Anyone can read frequencies (public reference data)

#### `catalog_data_classifications`
Data classification codes.

**Columns:**
- `code` (VARCHAR, Primary Key) - Classification code
- `name` (VARCHAR, NOT NULL) - Classification name
- `notes` (TEXT) - Additional notes

**RLS Policies:**
- Anyone can read classifications (public reference data)

#### `catalog_tags`
Dataset tags for categorization.

**Columns:**
- `id` (UUID, Primary Key) - Unique tag identifier
- `name` (VARCHAR(80), UNIQUE, NOT NULL) - Tag name

**RLS Policies:**
- Anyone can read tags
- Authenticated users can create/update/delete tags

#### `catalog_themes`
Dataset themes for categorization.

**Columns:**
- `id` (UUID, Primary Key) - Unique theme identifier
- `code` (VARCHAR(50), UNIQUE, NOT NULL) - Theme code
- `name` (VARCHAR(120), NOT NULL) - Theme name
- `icon_url` (TEXT) - Theme icon URL

**RLS Policies:**
- Anyone can read themes
- Authenticated users can create/update/delete themes

#### `spatial_units`
Geographic/spatial units for data coverage.

**Columns:**
- `id` (UUID, Primary Key) - Unique spatial unit identifier
- `name` (VARCHAR(200), NOT NULL) - Unit name
- `code` (VARCHAR(20), NOT NULL) - Unit code
- `level` (spatial_level ENUM, NOT NULL) - Administrative level
- `parent_id` (UUID) - Parent spatial unit
- `metadata` (JSONB, DEFAULT {}) - Additional metadata

**Relationships:**
- Self-referencing: `parent_id` → `spatial_units.id`
- Referenced by: `catalog_dataset_spatial_coverage.spatial_id`

**RLS Policies:**
- Anyone can view spatial units (public reference data)

### Junction Tables

#### `catalog_dataset_tags`
Many-to-many relationship between datasets and tags.

**Columns:**
- `dataset_id` (UUID, NOT NULL) - Dataset identifier
- `tag_id` (UUID, NOT NULL) - Tag identifier

**Constraints:**
- Primary Key: `(dataset_id, tag_id)`

**RLS Policies:**
- Anyone can view dataset tags
- Authenticated users can manage dataset tags

#### `catalog_dataset_themes`
Many-to-many relationship between datasets and themes.

**Columns:**
- `dataset_id` (UUID, NOT NULL) - Dataset identifier
- `theme_id` (UUID, NOT NULL) - Theme identifier

**Constraints:**
- Primary Key: `(dataset_id, theme_id)`

**RLS Policies:**
- Anyone can view dataset themes
- Authenticated users can manage dataset themes

#### `catalog_dataset_spatial_coverage`
Many-to-many relationship between datasets and spatial coverage areas.

**Columns:**
- `dataset_id` (UUID, NOT NULL) - Dataset identifier
- `spatial_id` (UUID, NOT NULL) - Spatial unit identifier

**Constraints:**
- Primary Key: `(dataset_id, spatial_id)`

**RLS Policies:**
- Anyone can view spatial coverage
- Authenticated users can manage spatial coverage

### Access Control

#### `api_keys`
API keys for programmatic access to the platform.

**Columns:**
- `id` (UUID, Primary Key) - Unique API key identifier
- `user_id` (UUID, NOT NULL) - Owner of the API key
- `key_prefix` (TEXT, NOT NULL) - Visible prefix of the key
- `key_hash` (TEXT, NOT NULL) - Hashed version of the full key
- `name` (TEXT) - Friendly name for the key
- `is_active` (BOOLEAN, DEFAULT true) - Whether key is active
- `last_used_at` (TIMESTAMP) - Last usage timestamp
- `created_at` (TIMESTAMP) - Creation timestamp

**Relationships:**
- `user_id` → `org_users.id`

**RLS Policies:**
- **Users can view own API keys**: Filtered by user_id
- **Admins can manage all API keys**: ADMIN or WALIDATA roles have full access

#### `gov_dataset_policies`
Government dataset access policies.

**Columns:**
- `id` (UUID, Primary Key) - Unique policy identifier
- `dataset_id` (UUID, NOT NULL) - Target dataset
- `rule` (policy_rule ENUM, NOT NULL) - Policy rule type
- `subject_type` (policy_subject_type ENUM, NOT NULL) - Subject type
- `subject_id` (UUID) - Subject identifier
- `constraint_text` (VARCHAR(255)) - Policy constraint description
- `details` (JSONB, DEFAULT {}) - Additional policy details
- `created_at` (TIMESTAMP) - Creation timestamp

**Relationships:**
- `dataset_id` → `catalog_metadata.id`

**RLS Policies:**
- Authenticated users can view dataset policies

### Telemetry & Audit

#### `telemetry_audit_events`
Audit log for system actions.

**Columns:**
- `id` (BIGINT, Primary Key) - Sequential audit identifier
- `actor_id` (UUID) - User performing action
- `action` (VARCHAR(60), NOT NULL) - Action performed
- `object_type` (VARCHAR(40)) - Type of object acted upon
- `object_id` (UUID) - Identifier of object acted upon
- `context` (JSONB, DEFAULT {}) - Additional context
- `created_at` (TIMESTAMP) - Event timestamp

**Relationships:**
- `actor_id` → `org_users.id`

**RLS Policies:**
- **Authenticated users can view audit events**: Logged-in users can view
- **Users can create audit events**: Any authenticated user can create

#### `telemetry_downloads`
Download tracking for distributions.

**Columns:**
- `id` (BIGINT, Primary Key) - Sequential download identifier
- `distribution_id` (UUID, NOT NULL) - Downloaded distribution
- `user_id` (UUID) - Downloading user (null for anonymous)
- `channel` (download_channel ENUM, NOT NULL) - Download channel
- `client_info` (JSONB, DEFAULT {}) - Client information
- `session_id` (TEXT) - Session identifier for anonymous users
- `created_at` (TIMESTAMP) - Download timestamp

**Relationships:**
- `distribution_id` → `catalog_distributions.id`

**RLS Policies:**
- **Anyone can view download logs**: Public access for transparency
- **Authenticated users can log downloads**: With rate limiting via `can_log_download()`
- **Guests can log downloads with session cooldown**: Anonymous tracking with 30-minute cooldown

#### `telemetry_views`
Dataset view tracking.

**Columns:**
- `id` (BIGINT, Primary Key) - Sequential view identifier
- `dataset_id` (UUID, NOT NULL) - Viewed dataset
- `user_id` (UUID) - Viewing user (null for anonymous)
- `ip_address` (INET) - Viewer IP address
- `referrer` (TEXT) - HTTP referrer
- `session_id` (VARCHAR) - Session identifier
- `user_agent` (TEXT) - Browser user agent
- `created_at` (TIMESTAMP) - View timestamp

**Relationships:**
- `dataset_id` → `catalog_metadata.id`

**RLS Policies:**
- **Anyone can insert view records**: Public tracking
- **Users can view their own view records**: Filtered by user_id

## Enums

### `org_type`
- `WALIDATA` - Data validator organization
- `PRODUSEN_DATA` - Data producer organization
- `KOORDINATOR` - Coordinating organization
- `LAINNYA` - Other organization types

### `resource_type`
- `TABLE` - Tabular data
- `FILE` - File-based data
- `API` - API-based data access
- `LINK` - External link

### `availability_type`
- `online` - Data is available online
- `offline` - Data is offline
- `archived` - Data is archived

### `classification_type`
- `PUBLIC` - Publicly accessible data
- `TERBATAS` - Restricted access data

### `spatial_level`
- `PROV` - Province level
- `KAB` - Regency/City level
- `KEC` - District level
- `DESA` - Village level
- `KEL` - Urban village level
- `OTHER` - Other spatial levels

### `download_channel`
- `WEB` - Web interface downloads
- `API` - API-based downloads
- `DIRECT` - Direct access downloads

### `policy_rule`
- `VIEW` - View permission
- `DOWNLOAD` - Download permission
- `UPDATE` - Update permission
- `ADMIN` - Administrative permission

### `policy_subject_type`
- `USER` - Individual user
- `ROLE` - User role
- `ORG` - Organization

### `publication_status`
- `DRAFT` - Dataset in draft state
- `PENDING_REVIEW` - Awaiting review
- `PUBLISHED` - Publicly published
- `REJECTED` - Review rejected

### `qualifier_type`
- `NA` - Not available
- `OFFICIAL` - Official data
- `PRELIM` - Preliminary data
- `EST` - Estimated data

### `time_grain_type`
- `YEAR` - Yearly data
- `QUARTER` - Quarterly data
- `MONTH` - Monthly data

### `dataset_status`
- `unassigned` - Priority dataset not yet assigned
- `assigned` - Assigned to an organization by admin/coordinator
- `claimed` - Claimed by an organization (legacy)

### `priority_action`
- `assign` - Dataset assigned to organization
- `claim` - Dataset claimed by organization (legacy)
- `update` - Dataset metadata updated
- `unassign` - Assignment removed
- `converted` - Converted to catalog dataset
- `reset` - Full reset to unassigned status

## Database Functions

### Role & Permission Functions

#### `has_role(_role_code TEXT)`
Checks if the current user has a specific role.

**Security:** SECURITY DEFINER - Bypasses RLS to prevent recursion

**Returns:** `BOOLEAN`

**Example:**
```sql
SELECT has_role('ADMIN'); -- true if user has ADMIN role
```

#### `is_admin(_user_id UUID DEFAULT auth.uid())`
Checks if a user has admin privileges.

**Security:** SECURITY DEFINER

**Returns:** `BOOLEAN`

#### `has_admin_or_walidata_role()`
Checks if current user has admin or walidata role.

**Security:** SECURITY DEFINER

**Returns:** `BOOLEAN`

#### `can_modify_user_role(_target_role_code TEXT)`
Checks if current user can modify users with a specific role.

**Rules:**
- ADMIN can modify any role
- WALIDATA can only modify VIEWER and PRODUSEN roles

**Security:** SECURITY DEFINER

**Returns:** `BOOLEAN`

### Organization Functions

#### `auth_org_id()`
Returns the current user's organization ID.

**Security:** SECURITY DEFINER

**Returns:** `UUID`

#### `get_user_org_id()`
Alias for `auth_org_id()`.

**Returns:** `UUID`

### Telemetry Functions

#### `get_dataset_download_count(dataset_id_param UUID)`
Gets total download count for a dataset.

**Returns:** `BIGINT`

#### `get_dataset_view_count(dataset_id_param UUID)`
Gets total view count for a dataset.

**Returns:** `BIGINT`

#### `get_datasets_download_counts(dataset_ids UUID[])`
Gets download counts for multiple datasets.

**Returns:** `TABLE(dataset_id UUID, download_count BIGINT)`

#### `get_datasets_view_counts(dataset_ids UUID[])`
Gets view counts for multiple datasets.

**Returns:** `TABLE(dataset_id UUID, view_count BIGINT)`

#### `can_log_download(p_distribution_id UUID, p_user_id UUID, p_session_id TEXT)`
Checks if a download can be logged (30-minute rate limit).

**Returns:** `BOOLEAN`

### Priority Dataset Functions

#### `fn_convert_priority_to_dataset(p_priority_dataset_id UUID, p_assignee_org_id UUID, p_user_id UUID)`
Converts a priority dataset to a catalog dataset.

**Process:**
1. Fetches priority dataset
2. Generates unique slug
3. Creates catalog_metadata entry with:
   - `title` from priority dataset name
   - `is_priority = true`
   - `priority_dataset_id` link
   - `publication_status = 'DRAFT'`
4. Logs conversion action

**Returns:** `UUID` (new catalog_metadata.id)

**Security:** SECURITY DEFINER

### User Management Functions

#### `get_user_role(user_id UUID)`
Gets the primary role code for a user (legacy function).

**Returns:** `TEXT`

**Note:** With multi-role support, use `has_role()` instead.

#### `handle_new_user()`
Trigger function for new user registration.

**Process:**
1. Creates profile entry
2. Creates org_users entry
3. Assigns default VIEWER role

**Returns:** Trigger result

## Row Level Security (RLS)

All tables have Row Level Security enabled. Policies control access based on:

### Access Control Layers

1. **Public Access**: Published public datasets viewable by everyone
2. **Organization-based**: Users access their organization's data
3. **Role-based**: ADMIN/WALIDATA have broader access
4. **Publication Status**: Draft/pending datasets hidden from public

### Critical Security Rules

**NEVER check roles client-side for security:**
```typescript
// ❌ WRONG - Can be bypassed
if (userRole === 'admin') { allowAccess(); }

// ✅ CORRECT - RLS enforces on database
const { data } = await supabase.from('catalog_metadata').select('*');
// RLS automatically filters based on actual roles
```

**Roles MUST be in separate table:**
- `org_user_roles` table stores role assignments
- RLS policies on org_user_roles prevent self-assignment
- Security definer functions check roles without recursion

## Key Relationships

### Dataset Hierarchy
```
catalog_metadata (dataset)
├── catalog_resources (resources within dataset)
│   ├── catalog_distributions (downloadable files/endpoints)
│   ├── data_indicators (metrics/columns)
│   │   └── data_points (actual data values)
│   └── data_table_view_columns (display configuration)
├── catalog_dataset_tags (categorization)
├── catalog_dataset_themes (theming)
├── catalog_dataset_spatial_coverage (geographic coverage)
└── priority_dataset_id → priority_datasets (if priority data)
```

### Organization Hierarchy
```
org_organizations (hierarchical)
└── org_users (organization members)
    └── org_user_roles (user permissions)
        └── org_roles (role definitions)
```

### Priority Data Flow
```
priority_datasets (central government list)
├── assigned_org → org_organizations
├── assigned_by → org_users
├── priority_dataset_logs (audit trail)
└── catalog_metadata.priority_dataset_id (converted datasets)
```

## Data Integrity

### Unique Constraints
- Dataset slugs must be unique
- User emails must be unique
- Indicator codes must be unique within a resource
- Data points are unique per indicator, period, and resource
- Priority dataset codes should be unique
- API key prefixes + user combinations must be unique

### Foreign Key Constraints
- All relationships are properly constrained
- CASCADE deletes where appropriate
- Organization ownership enforced for datasets and users

### Check Constraints
- Publication status transitions controlled
- Data classification levels restrict access appropriately
- Time grain types validated

## Performance Considerations

### Indexes
- Full-text search on dataset metadata
- Temporal range queries on datasets
- Organization-based filtering
- Time-series data access patterns
- Audit log chronological access
- Priority dataset status and code lookups
- Role-based access lookups

### Query Optimization
- Complex RLS policies optimized for common access patterns
- Aggregate functions for analytics queries
- Efficient pagination support for large datasets
- Security definer functions prevent recursive RLS checks

## Migration History

**Key Migrations:**
- Initial schema setup
- Role system overhaul (removed profiles.role)
- Priority datasets implementation
- API keys system
- Enhanced RLS policies
- Priority dataset reset capability
- Multi-chart dashboard support

This schema supports a comprehensive open data platform with:
- Proper role-based access controls
- Comprehensive audit trails
- Priority data workflow management
- Performance optimizations for large-scale data
- Security-first architecture
