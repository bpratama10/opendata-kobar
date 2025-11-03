# Database Schema Documentation

This document provides a comprehensive overview of the Supabase database schema for the Open Data Kobar platform. The schema is designed to manage open data catalogs, user organizations, data resources, and telemetry tracking.

## Overview

The database consists of several key domains:
- **Organization & User Management** (`org_*` tables)
- **Data Catalog** (`catalog_*` tables)
- **Data Resources & Indicators** (`data_*` tables)
- **Reference Data** (licenses, frequencies, classifications, etc.)
- **Telemetry & Audit** (`telemetry_*` tables)
- **Access Control** (policies, roles, permissions)

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
- Referenced by: `org_users.org_id`, `catalog_metadata.org_id`, `catalog_metadata.publisher_org_id`

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
- Referenced by: `catalog_metadata.created_by`, `catalog_metadata.updated_by`, `telemetry_audit_events.actor_id`, `telemetry_downloads.user_id`

**Indexes:**
- `idx_org_users_org_id`
- `idx_org_users_is_active`

#### `org_roles`
System roles for access control.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `code` (VARCHAR(40), UNIQUE, NOT NULL) - Role code (e.g., 'ADMIN', 'WALIDATA')
- `name` (VARCHAR(100), NOT NULL) - Human-readable role name
- `created_at` (TIMESTAMP) - Creation timestamp

**Relationships:**
- Referenced by: `org_user_roles.role_id`

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
- Referenced by: `catalog_resources.dataset_id`, `catalog_dataset_tags.dataset_id`, `catalog_dataset_themes.dataset_id`, `catalog_dataset_spatial_coverage.dataset_id`, `gov_dataset_policies.dataset_id`, `telemetry_views.dataset_id`

**Indexes:**
- `idx_catalog_metadata_org_id`
- `idx_catalog_metadata_classification`
- `idx_catalog_metadata_published`
- `idx_catalog_metadata_temporal`
- `idx_catalog_metadata_created_at`
- Full-text search: `idx_catalog_metadata_fulltext`

#### `catalog_resources`
Represents different resources (tables, files, APIs) within a dataset.

**Columns:**
- `id` (UUID, Primary Key) - Unique resource identifier
- `dataset_id` (UUID, NOT NULL) - Parent dataset
- `name` (VARCHAR(200), NOT NULL) - Resource name
- `resource_type` (resource_type ENUM, NOT NULL) - Type of resource
- `indicator_title` (TEXT) - Human-friendly title for the primary indicator contained in the resource
- `unit` (TEXT) - Standardized measurement unit used across all periods (e.g., "Rekaman")
- `frequency` (TEXT) - Update cadence descriptor (e.g., "Tahunan", "Triwulanan")
- `aggregation_method` (TEXT) - How yearly totals are aggregated (e.g., "Total per tahun")
- `time_dimension` (TEXT, DEFAULT 'year') - Canonical time axis label used to render charts
- `chart_type` (TEXT) - Preferred chart to render (line, area, slope, kpi, bar, table)
- `interpretation` (TEXT) - Optional human-readable insight to display alongside charts
- `is_timeseries` (BOOLEAN, DEFAULT false) - Signals that the resource should be visualized as a temporal trend
- `schema_json` (JSONB, DEFAULT {}) - Schema definition for structured data
- `description` (TEXT) - Resource description
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- `dataset_id` → `catalog_metadata.id`
- Referenced by: `catalog_distributions.resource_id`, `data_indicators.resource_id`, `data_points.resource_id`, `data_table_view_columns.resource_id`

**Constraints:**
- `chart_type` must be null or one of the supported visualization types (`line`, `area`, `slope`, `kpi`, `bar`, `table`)

**Indexes:**
- `idx_catalog_resources_dataset_id`
- `idx_catalog_resources_resource_type`

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

**Indexes:**
- `idx_catalog_distributions_resource_id`
- `idx_catalog_distributions_version`

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

**Indexes:**
- `idx_data_indicators_resource_id`

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
- `distribution_key` (STRING) - Distribution-specific key
- `attrs` (JSONB) - Additional attributes
- `row_dimension_value` (STRING) - Row dimension value
- `sub_header_value` (STRING) - Sub-header value
- `top_header_value` (STRING) - Top header value
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships:**
- `indicator_id` → `data_indicators.id`
- `resource_id` → `catalog_resources.id`
- `distribution_id` → `catalog_distributions.id`

**Constraints:**
- Unique: `(indicator_id, period_start, resource_id)`

**Indexes:**
- `idx_data_points_resource_period`
- `idx_data_points_indicator_period`
- `unique_data_point_indicator_period_resource`

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

**Indexes:**
- `idx_data_table_view_columns_resource_order`
- `idx_data_table_view_columns_resource_hidden`

### Reference Data

#### `lisensi`
License definitions for datasets.

**Columns:**
- `code` (VARCHAR(40), Primary Key) - License code
- `name` (VARCHAR(120), NOT NULL) - License name
- `url` (VARCHAR(255)) - License URL
- `notes` (TEXT) - Additional notes

**Relationships:**
- Referenced by: `catalog_metadata.license_code`

#### `freq_upd`
Update frequency definitions.

**Columns:**
- `code` (VARCHAR(20), Primary Key) - Frequency code
- `name` (VARCHAR(40), NOT NULL) - Frequency name
- `notes` (TEXT) - Additional notes

**Relationships:**
- Referenced by: `catalog_metadata.update_frequency_code`

#### `catalog_tags`
Dataset tags for categorization.

**Columns:**
- `id` (UUID, Primary Key) - Unique tag identifier
- `name` (VARCHAR(80), UNIQUE, NOT NULL) - Tag name

**Relationships:**
- Referenced by: `catalog_dataset_tags.tag_id`

#### `catalog_themes`
Dataset themes for categorization.

**Columns:**
- `id` (UUID, Primary Key) - Unique theme identifier
- `code` (VARCHAR(50), UNIQUE, NOT NULL) - Theme code
- `name` (VARCHAR(120), NOT NULL) - Theme name
- `icon_url` (VARCHAR(255)) - Theme icon URL

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

**Indexes:**
- `idx_spatial_units_level`
- `idx_spatial_units_code`

### Junction Tables

#### `catalog_dataset_tags`
Many-to-many relationship between datasets and tags.

**Columns:**
- `dataset_id` (UUID, NOT NULL) - Dataset identifier
- `tag_id` (UUID, NOT NULL) - Tag identifier

**Relationships:**
- `dataset_id` → `catalog_metadata.id`
- `tag_id` → `catalog_tags.id`

**Constraints:**
- Primary Key: `(dataset_id, tag_id)`

**Indexes:**
- `idx_catalog_dataset_tags_tag_id`

#### `catalog_dataset_themes`
Many-to-many relationship between datasets and themes.

**Columns:**
- `dataset_id` (UUID, NOT NULL) - Dataset identifier
- `theme_id` (UUID, NOT NULL) - Theme identifier

**Relationships:**
- `dataset_id` → `catalog_metadata.id`
- `theme_id` → `catalog_themes.id`

**Constraints:**
- Primary Key: `(dataset_id, theme_id)`

#### `catalog_dataset_spatial_coverage`
Many-to-many relationship between datasets and spatial coverage areas.

**Columns:**
- `dataset_id` (UUID, NOT NULL) - Dataset identifier
- `spatial_id` (UUID, NOT NULL) - Spatial unit identifier

**Relationships:**
- `dataset_id` → `catalog_metadata.id`
- `spatial_id` → `spatial_units.id`

**Constraints:**
- Primary Key: `(dataset_id, spatial_id)`

### Access Control

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

**Indexes:**
- `idx_gov_dataset_policies_dataset_id`
- `idx_gov_dataset_policies_subject`
- `idx_gov_dataset_policies_rule`

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

**Indexes:**
- `idx_telemetry_audit_events_actor_id`
- `idx_telemetry_audit_events_object`
- `idx_telemetry_audit_events_created_at`

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

**Indexes:**
- `idx_telemetry_downloads_distribution_id`
- `idx_telemetry_downloads_user_id`
- `idx_telemetry_downloads_created_at`
- `idx_telemetry_downloads_channel`
- `idx_telemetry_downloads_session_id`

#### `telemetry_views`
Dataset view tracking.

**Columns:**
- `id` (BIGINT, Primary Key) - Sequential view identifier
- `dataset_id` (UUID, NOT NULL) - Viewed dataset
- `user_id` (UUID) - Viewing user (null for anonymous)
- `ip_address` (INET) - Viewer IP address
- `referrer` (VARCHAR(255)) - HTTP referrer
- `session_id` (TEXT) - Session identifier
- `user_agent` (TEXT) - Browser user agent
- `created_at` (TIMESTAMP) - View timestamp

**Relationships:**
- `dataset_id` → `catalog_metadata.id`

**Indexes:**
- `idx_telemetry_views_dataset_id`
- `idx_telemetry_views_created_at`

### Legacy Tables

#### `profiles`
Legacy user profile table (being phased out in favor of org_users).

**Columns:**
- `id` (UUID, Primary Key) - User identifier
- `email` (VARCHAR(255), NOT NULL) - User email
- `full_name` (VARCHAR(255)) - User full name
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

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

## Database Functions

### `auth_org_id()`
Returns the current user's organization ID.

**Returns:** `UUID`

### `get_user_org_id()`
Returns the current user's organization ID (alias for auth_org_id).

**Returns:** `UUID`

### `has_role(_role_code)`
Checks if the current user has a specific role.

**Parameters:**
- `_role_code` (TEXT) - Role code to check

**Returns:** `BOOLEAN`

### `is_admin(_user_id?)`
Checks if a user has admin privileges.

**Parameters:**
- `_user_id` (UUID, optional) - User ID to check (defaults to current user)

**Returns:** `BOOLEAN`

### `has_admin_or_walidata_role()`
Checks if current user has admin or walidata role.

**Returns:** `BOOLEAN`

### `can_log_download(p_distribution_id, p_session_id, p_user_id)`
Checks if a download can be logged (for rate limiting).

**Parameters:**
- `p_distribution_id` (UUID) - Distribution being downloaded
- `p_session_id` (TEXT) - Session identifier
- `p_user_id` (UUID) - User identifier

**Returns:** `BOOLEAN`

### `can_modify_user_role(_target_role_code)`
Checks if current user can modify users with a specific role.

**Parameters:**
- `_target_role_code` (TEXT) - Target role code

**Returns:** `BOOLEAN`

### `get_dataset_download_count(dataset_id_param)`
Gets total download count for a dataset.

**Parameters:**
- `dataset_id_param` (UUID) - Dataset identifier

**Returns:** `INTEGER`

### `get_dataset_view_count(dataset_id_param)`
Gets total view count for a dataset.

**Parameters:**
- `dataset_id_param` (UUID) - Dataset identifier

**Returns:** `INTEGER`

### `get_datasets_download_counts(dataset_ids)`
Gets download counts for multiple datasets.

**Parameters:**
- `dataset_ids` (UUID[]) - Array of dataset identifiers

**Returns:** `TABLE(dataset_id UUID, download_count INTEGER)`

### `get_datasets_view_counts(dataset_ids)`
Gets view counts for multiple datasets.

**Parameters:**
- `dataset_ids` (UUID[]) - Array of dataset identifiers

**Returns:** `TABLE(dataset_id UUID, view_count INTEGER)`

### `get_user_role(user_id)`
Gets the primary role code for a user.

**Parameters:**
- `user_id` (UUID) - User identifier

**Returns:** `TEXT`

## Row Level Security (RLS)

All tables have Row Level Security enabled with policies controlling access based on:

1. **Organization-based access**: Users can access data from their organization
2. **Public data access**: Published public datasets are accessible to all
3. **Role-based permissions**: Admin and Walidata roles have broader access
4. **Publication status**: Only published datasets are publicly visible

Key policies include:
- Public datasets are viewable by everyone when published
- Users can manage data within their organization
- Admin/Walidata roles have system-wide access
- Audit events track all data access and modifications

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
└── catalog_dataset_spatial_coverage (geographic coverage)
```

### Organization Hierarchy
```
org_organizations (hierarchical)
└── org_users (organization members)
    └── org_user_roles (user permissions)
```

### User Data Flow
```
org_users → catalog_metadata → catalog_resources → data_indicators → data_points
```

## Data Integrity

### Unique Constraints
- Dataset slugs must be unique
- User emails must be unique
- Indicator codes must be unique within a resource
- Data points are unique per indicator, period, and resource

### Foreign Key Constraints
- All relationships are properly constrained with CASCADE deletes where appropriate
- Organization ownership is enforced for datasets and users

### Check Constraints
- Publication status transitions are controlled
- Data classification levels restrict access appropriately

## Performance Considerations

### Indexes
- Full-text search on dataset metadata
- Temporal range queries on datasets
- Organization-based filtering
- Time-series data access patterns
- Audit log chronological access

### Partitioning Strategy
- Telemetry tables use time-based partitioning for large datasets
- Audit events are partitioned by creation date

### Query Optimization
- Complex RLS policies are optimized for common access patterns
- Aggregate functions provided for common analytics queries
- Efficient pagination support for large datasets

## Time-Series Resources & Ingestion Guidance

To standardize yearly indicator datasets and drive meaningful visualizations:

1. Resource Metadata (`catalog_resources`)
   - Maintain `indicator_title`, `unit`, `frequency`, `aggregation_method`, `time_dimension`, `chart_type`, `interpretation`, `is_timeseries`
   - `chart_type` should be one of `line`, `area`, `slope`, `kpi`, `bar`, `table`
   - Set `is_timeseries = true` for time-trend resources so the frontend renders the appropriate charts automatically

2. Data Format (Long/Normalized)
   - Each row in `data_points` must represent the annual total for a single indicator and calendar period
   - Required combination: `(indicator_id, resource_id, period_start)` unique per row
   - Recommended ingestion pipeline:
     1. Convert wide spreadsheets into long format with columns `(indicator_code, indicator_label, year, value, unit, notes?)`
     2. Map indicator metadata into `data_indicators`
     3. Create/maintain `data_table_view_columns` entries for each year (sorted ascending)
     4. Upsert yearly totals into `data_points` using the uniqueness constraint

3. Validation Checklist (pre-ingestion)
   - Confirm all years in the expected range exist (no gaps unless justified)
   - Ensure units and aggregation method are consistent across years
   - Detect duplicate `(indicator, year)` rows before ingestion
   - Flag mixed time grains (e.g., mixing quarterly and yearly data) for normalization

4. Recommended Workflow
   - Backfill metadata for existing resources with new fields (frequency, aggregation method, etc.)
   - Add validation logic in ETL/admin upload flow to enforce the checklist above
   - Tag resources with `is_timeseries` so UI can auto-select charts
   - Store helpful narrative guidance in `interpretation` to surface insights in the portal

This schema supports a comprehensive open data platform with proper access controls, audit trails, and performance optimizations for handling large volumes of data and users.
