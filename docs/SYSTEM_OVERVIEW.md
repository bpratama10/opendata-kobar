# System Overview - Open Data Platform

## Quick Start for AI Agents

This document provides a comprehensive overview of how the Open Data Platform works, enabling AI agents to understand the system architecture, data flows, and key patterns.

## What is This Application?

The **Open Data Platform** is a full-stack web application for managing and publishing government/organizational datasets. It enables:

1. **Public Users**: Browse, search, and download published datasets
2. **Data Publishers (PRODUSEN)**: Create and manage datasets for their organization
3. **Data Coordinators (KOORDINATOR)**: View all datasets within their organization
4. **Data Stewards (WALIDATA)**: Review, approve, and publish datasets across organizations
5. **Administrators (ADMIN)**: Full system management and configuration

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Security**: Row-Level Security (RLS) policies
- **Authentication**: Supabase Auth with JWT tokens

## Core Concepts

### 1. Datasets (catalog_metadata)

The central entity representing a collection of data. Each dataset has:
- **Metadata**: Title, description, contact info, temporal coverage
- **Classification**: PUBLIC, INTERNAL, or CONFIDENTIAL
- **Publication Status**: DRAFT → PENDING_REVIEW → PUBLISHED
- **Resources**: Attached data files or structured tables
- **Tags & Themes**: Categorization for discovery
- **Organization**: Publisher organization

### 2. Resources (catalog_resources)

Datasets can have multiple resources:
- **TABLE**: Structured data with indicators and time periods
- **FILE**: Downloadable files (CSV, Excel, PDF, etc.)
- **API**: API endpoints
- **WEB**: Web links

### 3. Data Tables (Structured Data Entry)

For TABLE resources, users can enter structured data in a spreadsheet-like interface:
- **Indicators** (rows): What is being measured (e.g., "Total Population", "GDP Growth")
- **Periods** (columns): Time periods (years, quarters, months)
- **Data Points**: Values at the intersection of indicator × period

### 4. Role-Based Access Control (RBAC)

**CRITICAL SECURITY MODEL:**

Roles are stored in `org_user_roles` table (NEVER in user profile table):

```
User → org_user_roles → org_roles
  └─> (user_id)      └─> (role_id) → (code: ADMIN|WALIDATA|...)
```

**Role Hierarchy** (lowest to highest):
1. **VIEWER**: Read-only access to internal datasets
2. **PRODUSEN**: Create/edit own organization's datasets (DRAFT/PENDING_REVIEW)
3. **KOORDINATOR**: View all datasets within organization
4. **WALIDATA**: Review/publish datasets across all organizations
5. **ADMIN**: Full system access

**Security Pattern:**
```typescript
// ❌ NEVER check roles client-side for security
if (user.role === 'admin') { /* INSECURE */ }

// ✅ Use client-side checks for UI only
const { hasRole } = useRoleAccess();
if (hasRole('ADMIN')) { return <AdminPanel />; }

// ✅ Security is enforced by RLS policies
const { data } = await supabase.from('catalog_metadata').select('*');
// RLS automatically filters by user's permissions
```

## Key User Workflows

### Workflow 1: Public User Browsing Datasets

```
1. Visit homepage (/)
   ↓
2. Browse datasets by themes or search
   ↓
3. Click on dataset → View detail page (/dataset/:slug)
   ↓
4. Download resources (tracked in telemetry_downloads)
```

**Key Files:**
- `src/pages/Index.tsx` - Homepage with search and themes
- `src/pages/DatasetList.tsx` - Dataset listing (if implemented)
- `src/pages/DatasetDetail.tsx` - Dataset detail view
- `src/hooks/useDatasets.ts` - Fetch datasets hook

### Workflow 2: Data Publisher Creating a Dataset

```
1. Login (/auth) → Authenticated as PRODUSEN
   ↓
2. Navigate to /admin/datasets → Click "Add Dataset"
   ↓
3. Fill form at /admin/datasets/add
   - Title, description, metadata
   - Select organization (must be user's org)
   - Add tags and themes
   - Set classification and status (DRAFT)
   ↓
4. Save → Creates catalog_metadata record
   ↓
5. Add resources → /admin/resources
   - Upload files OR create TABLE resource
   ↓
6. For TABLE resources → /admin/datasets/:id/tables
   - Define indicators (rows)
   - Define periods (columns)
   - Enter data points (values)
   ↓
7. Change status to PENDING_REVIEW
   ↓
8. WALIDATA reviews and publishes
```

**Key Files:**
- `src/pages/admin/AdminDatasetAdd.tsx` - Dataset creation form
- `src/pages/admin/AdminDatasetEdit.tsx` - Dataset editing
- `src/pages/admin/AdminDataTables.tsx` - Data table management
- `src/components/admin/dataTables/DataEntryGrid.tsx` - Spreadsheet interface
- `src/hooks/useDatasets.ts` - Dataset CRUD operations

### Workflow 3: Data Table Management

The most complex feature - structured data entry:

```
1. Open /admin/datasets/:id/tables
   ↓
2. System loads:
   - Indicators (data_indicators table)
   - Periods (data_table_view_columns table)
   - Data Points (data_points table)
   ↓
3. User sees spreadsheet-like grid:
   - Rows = Indicators
   - Columns = Time Periods
   - Cells = Data Values
   ↓
4. User edits cell:
   - OnBlur triggers upsert to data_points
   - Qualifier auto-set: value ? 'OFFICIAL' : 'NA'
   - Unique constraint: (indicator_id, period_start, resource_id)
   ↓
5. Add new indicator:
   - Create data_indicators record
   - Grid automatically adds new row
   ↓
6. Add new period:
   - Create data_table_view_columns record
   - Grid automatically adds new column
```

**Key Files:**
- `src/components/admin/DataTablesManagement.tsx` - Main container
- `src/components/admin/dataTables/IndicatorsManager.tsx` - Manage indicators
- `src/components/admin/dataTables/PeriodsManager.tsx` - Manage periods
- `src/components/admin/dataTables/DataEntryGrid.tsx` - Spreadsheet grid
- `src/hooks/useIndicators.ts` - Indicators CRUD
- `src/hooks/usePeriods.ts` - Periods CRUD
- `src/hooks/useDataPoints.ts` - Data points CRUD

## Database Architecture

### Multi-Tenant Model

```
org_organizations (Orgs)
  ↓
catalog_metadata (Datasets)
  ↓
catalog_resources (Resources)
  ↓
├─ catalog_distributions (Files)
└─ data_indicators + data_points (Tables)
```

### Security Model (Row-Level Security)

Every table has RLS policies that check:
1. Is user authenticated?
2. What roles does user have? (via has_role() function)
3. Does dataset belong to user's organization? (via auth_org_id() function)
4. What is dataset's publication status?

**Example Policy Logic:**
```sql
-- Dataset viewing policy
CREATE POLICY "Dataset viewing policy" ON catalog_metadata FOR SELECT
USING (
  -- Public datasets
  (publication_status = 'PUBLISHED' AND classification_code = 'PUBLIC')
  OR
  -- Authenticated users with proper access
  (auth.uid() IS NOT NULL AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR has_role('KOORDINATOR')
    OR (publisher_org_id = auth_org_id())
  ))
);
```

## Common Patterns

### Pattern 1: Fetching Data

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const { data, isLoading, error } = useQuery({
  queryKey: ['datasets'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('catalog_metadata')
      .select('*')
      .eq('publication_status', 'PUBLISHED')
      .is('deleted_at', null);
    
    if (error) throw error;
    return data;
  }
});
```

### Pattern 2: Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: async (newDataset) => {
    const { data, error } = await supabase
      .from('catalog_metadata')
      .insert(newDataset)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    // Invalidate cache to refetch
    queryClient.invalidateQueries({ queryKey: ['datasets'] });
  }
});
```

### Pattern 3: Role Checking

```typescript
import { useRoleAccess } from '@/hooks/useRoleAccess';

function AdminPanel() {
  const { hasRole, isLoading } = useRoleAccess();
  
  if (isLoading) return <Spinner />;
  
  // UI-only check
  if (!hasRole('ADMIN')) {
    return <AccessDenied />;
  }
  
  // RLS still enforces security on data queries
  return <AdminContent />;
}
```

### Pattern 4: Upsert Data Points

```typescript
const upsertDataPoint = async (indicatorId, period, value) => {
  const { data, error } = await supabase
    .from('data_points')
    .upsert({
      indicator_id: indicatorId,
      resource_id: resourceId,
      period_start: period.period_start,
      time_grain: period.time_grain,
      period_label: period.column_label,
      value: value,
      qualifier: value ? 'OFFICIAL' : 'NA'
    }, {
      onConflict: 'indicator_id,resource_id,period_start'
    });
  
  if (error) throw error;
  return data;
};
```

## State Management Strategy

### Server State (TanStack Query)
- All data from Supabase
- Automatic caching and revalidation
- Optimistic updates
- Query key structure: `['entityName', filters...]`

### Local State (React Hooks)
- Form inputs: useState
- UI toggles: useState
- Derived data: useMemo
- Event handlers: useCallback

### URL State (React Router)
- Route params: useParams()
- Query strings: useSearchParams()
- Navigation: useNavigate()

## Design System

### Color Tokens (index.css)

All colors use HSL format and semantic tokens:

```css
:root {
  --primary: 210 90% 48%;     /* Professional blue */
  --secondary: 180 65% 45%;   /* Teal */
  --background: 0 0% 100%;    /* White */
  --foreground: 222 47% 11%;  /* Dark text */
}
```

### Component Styling

```tsx
// ❌ NEVER use direct colors
<Button className="bg-blue-500 text-white" />

// ✅ ALWAYS use semantic tokens
<Button className="bg-primary text-primary-foreground" />
```

## Error Handling

### Levels of Error Handling

1. **Database**: Constraints, RLS policies, triggers
2. **Supabase Client**: Error objects from queries
3. **Custom Hooks**: try/catch, throw errors
4. **Components**: Error states, fallback UI
5. **User Feedback**: Toast notifications

### Standard Pattern

```typescript
const { data, isLoading, error } = useQuery({ ... });

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

## Performance Optimizations

1. **Code Splitting**: Route-based lazy loading
2. **Query Optimization**: Select only needed fields
3. **Caching**: TanStack Query with stale time
4. **Memoization**: useMemo for expensive computations
5. **Debouncing**: Search inputs, auto-save

## Common Pitfalls to Avoid

### ❌ Security Anti-Patterns

```typescript
// NEVER store roles in profiles table
await supabase.from('profiles').update({ role: 'admin' });

// NEVER rely on client-side checks for security
if (localStorage.getItem('isAdmin') === 'true') { /* INSECURE */ }

// NEVER bypass RLS with service role key in frontend
```

### ✅ Correct Patterns

```typescript
// Use org_user_roles table
await supabase.from('org_user_roles').insert({ user_id, role_id });

// Rely on RLS for security
const { data } = await supabase.from('catalog_metadata').select('*');
// RLS filters based on user's permissions

// Use security definer functions in RLS policies
CREATE POLICY "..." USING (has_role('ADMIN'));
```

## Testing Strategy

1. **Manual Testing**: Preview in browser
2. **RLS Testing**: Test with different user roles
3. **Data Validation**: Test edge cases (null values, empty strings)
4. **Error Scenarios**: Test network errors, auth failures
5. **Performance**: Test with large datasets

## Deployment

- **Frontend**: Hosted on Lovable.dev
- **Backend**: Supabase cloud
- **Environment Variables**: 
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
- **Database Migrations**: Applied via Supabase Dashboard or CLI

## Key Files Reference

### Routing
- `src/App.tsx` - Route definitions

### Pages
- `src/pages/Index.tsx` - Homepage
- `src/pages/DatasetDetail.tsx` - Dataset view
- `src/pages/Auth.tsx` - Login
- `src/pages/Admin.tsx` - Admin dashboard
- `src/pages/admin/AdminDatasets.tsx` - Dataset management
- `src/pages/admin/AdminDataTables.tsx` - Data table editing

### Hooks
- `src/hooks/useAuth.ts` - Authentication state
- `src/hooks/useRoleAccess.ts` - Role checking
- `src/hooks/useDatasets.ts` - Dataset CRUD
- `src/hooks/useDataPoints.ts` - Data points CRUD

### Components
- `src/components/Header.tsx` - Navigation
- `src/components/SearchBar.tsx` - Search interface
- `src/components/DataCard.tsx` - Dataset card display
- `src/components/admin/DataTablesManagement.tsx` - Data tables

### Integrations
- `src/integrations/supabase/client.ts` - Supabase client setup
- `src/integrations/supabase/types.ts` - Generated DB types

## Getting Help

- **Architecture**: See `docs/ARCHITECTURE.md`
- **Database Schema**: See `docs/SCHEMA.md`
- **API Contracts**: See `docs/API_CONTRACTS.md`
- **Environment Setup**: See `docs/ENV_SETUP.md`
- **UI Specifications**: See `docs/UI_SPEC.md`
