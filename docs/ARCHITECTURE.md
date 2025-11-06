# Architecture - Open Data Platform

**Last Updated:** 2025-01-20

## System Overview

The Open Data Platform is a **full-stack web application** built with React frontend and Supabase backend. It follows a **client-side rendered (CSR)** architecture with server-side authorization through Row-Level Security (RLS) policies.

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (SPA)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Public   │  │    Admin     │  │  Data Management     │ │
│  │   Portal   │  │  Dashboard   │  │  (Priority & Tables) │ │
│  └────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
            ┌───────────────────────────────┐
            │   Supabase Client (JS SDK)    │
            └───────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │ PostgreSQL   │  │    Auth    │  │   Edge Functions   │  │
│  │   + RLS      │  │  (JWT)     │  │   (API, etc.)      │  │
│  └──────────────┘  └────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Application Structure

### Directory Layout

```
src/
├── assets/              # Static assets (images, icons)
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   │   ├── dataTables/ # Data table management
│   │   ├── PriorityDataTable.tsx
│   │   └── DatasetStatusCard.tsx (dual pie charts)
│   ├── producer/       # Producer-specific components (deprecated)
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
│   ├── useAuth.ts     # Authentication state
│   ├── useRoleAccess.ts  # Role-based permissions
│   ├── useDatasets.ts
│   └── useDataPoints.ts
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client and types
├── lib/                # Utility functions
│   ├── utils.ts
│   └── priority.ts    # Priority dataset API
├── pages/              # Route components
│   ├── Index.tsx      # Home/Discovery
│   ├── DatasetDetail.tsx
│   ├── Auth.tsx       # Login
│   └── admin/          # Admin pages
│       ├── Admin.tsx  # Dashboard with dual charts
│       ├── AdminDatasets.tsx
│       ├── PriorityData.tsx (ADMIN/KOORDINATOR/WALIDATA only)
│       └── AdminDataTables.tsx
├── App.tsx             # Root component with routing
├── main.tsx            # Entry point
└── index.css           # Global styles and design tokens
```

### Component Architecture

```
App (QueryClientProvider + Router)
├── Public Routes
│   ├── Index (Home/Discovery)
│   ├── DatasetDetail
│   └── Auth (Login)
└── Protected Routes (Admin)
    ├── AdminLayout (Sidebar + Content)
    │   ├── Dashboard (Admin.tsx)
    │   │   ├── DatasetStatusCard (2 pie charts)
    │   │   └── Role-based stats
    │   ├── PriorityData (ADMIN/KOORDINATOR/WALIDATA)
    │   │   ├── PriorityDataTable
    │   │   ├── AssignDialog (confirmation)
    │   │   └── ResetDialog (full reset)
    │   ├── AdminDatasets
    │   │   ├── AdminDatasetAdd
    │   │   ├── AdminDatasetEdit
    │   │   └── AdminDataTables
    │   │       ├── IndicatorsManager
    │   │       ├── PeriodsManager
    │   │       └── DataEntryGrid
    │   ├── AdminUsers
    │   ├── AdminOrganizations
    │   ├── AdminRoles
    │   ├── AdminTags
    │   ├── AdminThemes
    │   ├── AdminAnalytics
    │   └── AdminAudit
    └── Other management pages
```

## Routing Structure

### Public Routes (No Auth Required)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Index | Home page, dataset discovery, search |
| `/dataset/:slug` | DatasetDetail | Individual dataset details and metadata |
| `/auth` | Auth | Login page |

### Protected Routes (Auth Required)

| Route | Component | Role Access | Purpose |
|-------|-----------|-------------|---------|
| `/admin` | Admin | All authenticated | Admin dashboard with dual pie charts |
| `/admin/priority-data` | PriorityData | ADMIN, KOORDINATOR, WALIDATA | Central priority data management |
| `/admin/datasets` | AdminDatasets | PRODUSEN+ | Dataset list and management |
| `/admin/datasets/add` | AdminDatasetAdd | PRODUSEN+ | Create new dataset |
| `/admin/datasets/edit/:id` | AdminDatasetEdit | PRODUSEN+ | Edit existing dataset |
| `/admin/datasets/:id/tables` | AdminDataTables | PRODUSEN+ | Manage structured data tables |
| `/admin/users` | AdminUsers | ADMIN, WALIDATA | User management |
| `/admin/organizations` | AdminOrganizations | ADMIN, WALIDATA, KOORDINATOR | Organization management |
| `/admin/roles` | AdminRoles | ADMIN | Role management |
| `/admin/resources` | AdminResources | PRODUSEN+ | Resource management |
| `/admin/distributions` | AdminDistributions | PRODUSEN+ | Distribution management |
| `/admin/tags` | AdminTags | PRODUSEN+ | Tag management |
| `/admin/themes` | AdminThemes | WALIDATA+ | Theme management |
| `/admin/classifications` | AdminClassifications | WALIDATA+ | Classification codes |
| `/admin/licenses` | AdminLicenses | WALIDATA+ | License types |
| `/admin/frequency` | AdminFrequency | WALIDATA+ | Update frequencies |
| `/admin/analytics` | AdminAnalytics | WALIDATA+ | Usage analytics |
| `/admin/api-keys` | AdminAPIKeys | WALIDATA+ | API key management |
| `/admin/audit` | AdminAudit | WALIDATA+ | Audit logs |

**Role Hierarchy**: VIEWER < PRODUSEN < KOORDINATOR < WALIDATA < ADMIN

### Role-Based Access Control

Implemented via `useRoleAccess` hook with permissions:

```typescript
interface RolePermissions {
  canAccessAdmin: boolean;           // Not VIEWER
  canViewOrganizations: boolean;     // ADMIN, WALIDATA, KOORDINATOR
  canEditOrganizations: boolean;     // ADMIN only
  canManageUsers: boolean;           // ADMIN, WALIDATA
  canPublishDatasets: boolean;       // ADMIN, WALIDATA
  canEditDatasets: boolean;          // ADMIN, WALIDATA, PRODUSEN
  canViewAllDatasets: boolean;       // ADMIN, WALIDATA, KOORDINATOR
  canDeleteDatasets: boolean;        // ADMIN, WALIDATA, PRODUSEN
  canViewAudit: boolean;             // All admin roles
  canManageSystemSettings: boolean;  // ADMIN only
  isReadOnly: boolean;               // KOORDINATOR
  canManagePriorityData: boolean;    // ADMIN, KOORDINATOR
  canViewPriorityData: boolean;      // ADMIN, KOORDINATOR, WALIDATA
  isWalidataReadOnly: boolean;       // WALIDATA (for priority data)
}
```

## Priority Data Workflow

### Overview

Priority datasets are centrally-defined datasets that must be assigned to organizations for production. This workflow ensures controlled assignment and tracking.

### Workflow States

```
UNASSIGNED → ASSIGNED → CONVERTED (to catalog) → PUBLISHED
     ↑                       ↑
     └───────────────────────┘ (Reset capability)
```

### Role Capabilities

| Role | Capabilities |
|------|-------------|
| **ADMIN** | Full control: assign, convert, reset, view all |
| **KOORDINATOR** | Full control: assign, convert, reset, view all |
| **WALIDATA** | Read-only: view all priority data |
| **PRODUSEN** | No access to priority data menu |
| **VIEWER** | No access |

### Detailed Process

1. **Assignment** (ADMIN/KOORDINATOR):
   - View unassigned priority datasets in `/admin/priority-data`
   - Click "Assign to Organization"
   - Confirmation dialog shows:
     - Dataset name, code, operational definition
     - Organization selector
     - Confirmation prompt
   - System logs assignment action

2. **Conversion** (ADMIN/KOORDINATOR):
   - Assigned datasets show "Convert to Dataset" button
   - Conversion creates catalog_metadata entry with:
     - `is_priority = true`
     - `priority_dataset_id` link
     - `publication_status = 'DRAFT'`
     - Title from priority dataset name
     - Organization assignment
   - System logs conversion action
   - Badge changes to "Converted" (green)

3. **Reset** (ADMIN/KOORDINATOR):
   - For any assigned/claimed dataset
   - Click "Reset" button
   - Confirmation dialog warns:
     - Shows current assignment
     - Lists what will be cleared
     - Requires confirmation
   - Full reset clears:
     - Status → unassigned
     - assigned_org → null
     - assigned_by → null
     - assigned_at → null
     - claimed_by → null
     - claimed_at → null
   - System logs reset action
   - Dataset returns to unassigned pool

### UI Components

**PriorityDataTable:**
- Sorted by code (ascending)
- Operational definition as blue badge with dialog
- Missing definition as red badge
- Actions column shows role-appropriate buttons
- "View Only" badge for WALIDATA

**Dashboard Charts:**
- Dataset Status Distribution (all roles)
- Priority Data Status (ADMIN/KOORDINATOR/WALIDATA only)
  - Published: Converted and published
  - Assigned/Claimed: Assigned but not published
  - Unassigned: Waiting for assignment

## Data Flow

### 1. Read Flow (Public Dataset Discovery)

```
User visits "/" 
  ↓
Index component mounts
  ↓
useDatasets() hook executes
  ↓
supabase.from('catalog_metadata')
  .select('*, catalog_dataset_tags(*), catalog_dataset_themes(*)')
  .eq('publication_status', 'PUBLISHED')
  .eq('classification_code', 'PUBLIC')
  ↓
RLS Policy: "Dataset viewing policy" validates
  - publication_status = 'PUBLISHED'
  - classification_code = 'PUBLIC'
  ↓
PostgreSQL returns dataset list
  ↓
useDatasets() transforms data
  ↓
Component renders DataCard components
```

### 2. Read Flow (Authenticated Dataset Access)

```
User navigates to "/admin/datasets"
  ↓
AdminDatasets component mounts
  ↓
useAuth() retrieves session (JWT token)
  ↓
supabase query includes auth.uid() in context
  ↓
RLS Policy: "Dataset viewing policy" validates
  - Check if user has ADMIN/WALIDATA/KOORDINATOR role
  - OR check if dataset.publisher_org_id = user's org_id
  ↓
has_role() security definer function executes
  - Queries org_user_roles table (bypasses RLS)
  - Returns boolean
  ↓
Returns datasets user can access
```

### 3. Write Flow (Create Dataset)

```
User fills form at "/admin/datasets/add"
  ↓
Form submission triggers supabase.from('catalog_metadata').insert()
  ↓
RLS Policy: "Dataset creation policy" validates
  - User must be authenticated
  - User has ADMIN or WALIDATA role
  - OR user has PRODUSEN role AND publisher_org_id = auth_org_id()
  ↓
has_role() and auth_org_id() functions execute
  ↓
If authorized, INSERT proceeds
  ↓
Database triggers update updated_at timestamp
  ↓
Response returned to client
  ↓
TanStack Query invalidates cache
  ↓
UI refreshes with new dataset
```

### 4. Priority Dataset Flow (Assign & Convert)

```
ADMIN/KOORDINATOR visits "/admin/priority-data"
  ↓
PriorityDataTable loads
  ↓
Fetches priority_datasets sorted by code
  ↓
Checks catalog_metadata for conversions
  ↓
User clicks "Assign to Organization"
  ↓
AssignDialog opens with:
  - Dataset details
  - Organization selector
  - Confirmation prompt
  ↓
User selects org and confirms
  ↓
supabase.from('priority_datasets').update({
    assigned_org: orgId,
    status: 'assigned',
    assigned_by: userId,
    assigned_at: timestamp
  })
  ↓
RLS Policy validates ADMIN/KOORDINATOR role
  ↓
Update succeeds
  ↓
Log to priority_dataset_logs
  ↓
UI refreshes, shows "Convert to Dataset" button
  ↓
User clicks "Convert to Dataset"
  ↓
Calls fn_convert_priority_to_dataset RPC:
  1. Generates unique slug
  2. Creates catalog_metadata with:
     - title from priority name
     - is_priority = true
     - priority_dataset_id link
     - publication_status = 'DRAFT'
  3. Logs conversion action
  ↓
UI refreshes, shows "Converted" badge
  ↓
PRODUSEN can now find and edit in regular datasets
```

### 5. Complex Flow (Data Table Entry)

```
User opens "/admin/datasets/:id/tables"
  ↓
DataTablesManagement loads resource
  ↓
Three parallel managers load:
  - IndicatorsManager: loads data_indicators
  - PeriodsManager: loads data_table_view_columns
  - DataEntryGrid: loads data_points
  ↓
User edits a cell in DataEntryGrid
  ↓
Grid triggers useDataPoints().upsertDataPoint()
  ↓
supabase.from('data_points')
  .upsert({
    indicator_id,
    resource_id,
    period_start,
    value,
    qualifier: value ? 'OFFICIAL' : 'NA'
  }, {
    onConflict: 'indicator_id,period_start,resource_id'
  })
  ↓
RLS Policy: "Data points management policy" validates
  - User authenticated
  - User can edit the parent dataset (via joins)
  ↓
Upsert executes (UPDATE if exists, INSERT if not)
  ↓
UI updates optimistically via TanStack Query
```

## Session & Authentication Model

### Authentication Flow

```
User visits /auth
  ↓
Enters email + password
  ↓
supabase.auth.signInWithPassword({ email, password })
  ↓
Supabase Auth validates credentials
  ↓
Returns JWT access token + refresh token
  ↓
Tokens stored in localStorage
  ↓
supabase.auth.onAuthStateChange() triggers
  ↓
useAuth() hook updates with:
  - user session
  - profile data
  - orgRoles (from org_user_roles join)
  ↓
User redirected to /admin
  ↓
Dashboard displays role badges dynamically
```

### Session Management

- **Storage**: localStorage (configurable in supabase/client.ts)
- **Token Type**: JWT (JSON Web Token)
- **Token Location**: Authorization header (Bearer token)
- **Token Refresh**: Automatic via Supabase SDK
- **Session Duration**: Configurable in Supabase dashboard (default 1 hour)

### Authorization Pattern

**CRITICAL SECURITY UPDATE (2025-01-20):**
- The `profiles.role` column has been **REMOVED** to prevent privilege escalation attacks
- Roles are now stored **ONLY** in `org_user_roles` table with strict RLS
- Users cannot modify their own roles
- Multiple roles per user supported (PRODUSEN + WALIDATA, etc.)

**NEVER check roles client-side for security decisions. Always rely on RLS.**

```typescript
// ❌ WRONG - Client-side check (can be bypassed)
if (userRole === 'admin') {
  // Show admin UI
}

// ❌ WRONG - Using deprecated profile.role
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .single();
// This field no longer exists!

// ✅ CORRECT - Use org_user_roles for UI display
const { hasRole } = useRoleAccess();
if (hasRole('ADMIN')) {
  // Show admin UI (RLS still enforces actual access)
}

// ✅ CORRECT - RLS policies enforce security
const { data } = await supabase
  .from('catalog_metadata')
  .select('*');
// RLS automatically filters based on user's roles from org_user_roles
```

### Role Resolution Flow (Updated Security Model)

```
User makes authenticated request
  ↓
JWT token includes auth.uid()
  ↓
RLS policy calls has_role('ADMIN')
  ↓
Security definer function executes:
  SELECT EXISTS (
    SELECT 1 FROM org_user_roles ur
    JOIN org_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.code = 'ADMIN'
  )
  ↓
Returns boolean (checks org_user_roles ONLY)
  ↓
RLS policy allows/denies access

CRITICAL: Function does NOT check profiles.role (removed for security)
```

### Security Definer Functions

**Purpose**: Prevent infinite recursion in RLS policies

```sql
-- ❌ WRONG - Enables privilege escalation + infinite recursion
CREATE POLICY "Admin access"
ON catalog_metadata FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  -- ↑ SECURITY ISSUE: Users can update profiles.role themselves!
  -- ↑ Also causes infinite recursion with RLS on profiles
);

-- ✅ CORRECT - Uses security definer function with separate role table
CREATE POLICY "Admin access"
ON catalog_metadata FOR SELECT
USING (has_role('ADMIN'));

-- Security definer function bypasses RLS and checks org_user_roles
CREATE FUNCTION has_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_user_roles ur
    JOIN org_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.code = _role
  );
$$;

-- Strict RLS on org_user_roles prevents self-assignment
CREATE POLICY "Role-based user role management"
ON org_user_roles FOR ALL
USING (
  has_role('ADMIN') 
  OR (has_role('WALIDATA') AND /* limited roles only */)
);
```

## State Management

### Server State (TanStack Query)

- **Purpose**: Fetch, cache, and sync server data
- **Key Patterns**:
  - Queries for reads (`useQuery`)
  - Mutations for writes (`useMutation`)
  - Automatic cache invalidation
  - Optimistic updates

```typescript
// Example: useDatasets hook
const { datasets, loading, error, refetch } = useDatasets();

// Behind the scenes:
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['datasets'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('catalog_metadata')
      .select('*')
    if (error) throw error;
    return data;
  }
});
```

### Local State (React Hooks)

- **useState**: Component-local state (forms, UI toggles)
- **useEffect**: Side effects (subscriptions, timers)
- **useMemo**: Computed values (filtered lists, sorted data)
- **useCallback**: Memoized callbacks (event handlers)

### URL State (React Router)

- **useParams**: Route parameters (`/dataset/:slug`)
- **useSearchParams**: Query strings (`?search=climate&sort=recent`)
- **useNavigate**: Programmatic navigation

## Design System Architecture

### Color Token System

All colors use **HSL (Hue, Saturation, Lightness)** format for easy theming:

```css
:root {
  /* Semantic tokens */
  --primary: 210 90% 48%;  /* Professional blue */
  --secondary: 180 65% 45%; /* Teal accent */
  --destructive: 0 84% 60%; /* Red for errors */
  --success: 142 76% 36%;   /* Green for success */
  
  /* Usage in Tailwind */
  .btn-primary {
    @apply bg-primary text-primary-foreground;
    /* Compiles to: hsl(var(--primary)) */
  }
}
```

### Component Styling Strategy

1. **Semantic Tokens First**: Use design system variables
2. **Tailwind Classes**: For layout and spacing
3. **Custom Classes**: Only for complex animations
4. **No Inline Colors**: Always use tokens

```tsx
// ❌ BAD - Hardcoded colors
<Button className="bg-blue-500 text-white" />

// ✅ GOOD - Semantic tokens
<Button className="bg-primary text-primary-foreground" />
```

### Responsive Strategy

- **Mobile-first**: Base styles for mobile
- **Breakpoints**: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- **Container**: Max-width with responsive padding
- **Sidebar**: Collapsible with mini mode for mobile

## Performance Optimizations

### 1. Code Splitting
- React.lazy() for route-based splitting (future enhancement)
- Dynamic imports for heavy components

### 2. Query Optimization
- Select only required fields: `select('id, title, description')`
- Use indexes on frequently queried columns
- Limit results with `.limit(100)`
- Batch queries for related data

### 3. Caching Strategy
- TanStack Query default: 5 minutes stale time
- Manual invalidation after mutations
- Background refetch on window focus
- Query key patterns for efficient cache management

### 4. Component Optimization
- useMemo for expensive computations (chart data transforms)
- useCallback for stable references
- React.memo for pure components (when needed)
- Parallel data fetching with Promise.all

## Error Handling

### Levels of Error Handling

1. **Database Level**: RLS policies, constraints, triggers
2. **Supabase Client**: Error objects from queries
3. **React Hook Level**: try/catch in custom hooks
4. **Component Level**: Error states, fallback UI
5. **Global Level**: Error boundaries (future)

### Error Display Pattern

```typescript
const { data, loading, error } = useDatasets();

if (loading) return <LoadingSpinner />;
if (error) return <ErrorDisplay message={error} />;
return <DataList data={data} />;
```

## Dashboard Architecture

### Dual Pie Chart System

The admin dashboard displays two pie charts based on role:

**Chart 1: Dataset Status Distribution** (All roles)
- Published (green)
- Draft (gray)
- Need Review (red)

**Chart 2: Priority Data Status** (ADMIN/KOORDINATOR/WALIDATA only)
- Published (green) - Converted and published priority datasets
- Assigned/Claimed (amber) - Assigned but not yet published
- Unassigned (gray) - Waiting for assignment

**Implementation:**
```typescript
// DatasetStatusCard.tsx
const { permissions } = useRoleAccess();

// Always show regular dataset chart
<Card>Dataset Status Distribution</Card>

// Conditionally show priority chart
{permissions.canViewPriorityData && (
  <Card>Priority Data Status</Card>
)}
```

### Role-Based UI Rendering

```typescript
// Header displays actual user roles
{orgRoles.map((role) => (
  <Badge key={role.code}>{role.name}</Badge>
))}

// Sidebar filters menu items
items.filter(item => {
  if (item.url === '/admin/priority-data') {
    return permissions.canViewPriorityData;
  }
  return true;
})

// Component-level access control
if (!permissions.canViewPriorityData) {
  navigate('/admin/datasets');
  return null;
}
```

## Future Enhancements

- Real-time subscriptions for collaborative editing
- Enhanced edge function integration for complex operations
- File storage for dataset attachments
- GraphQL API layer
- Advanced caching with service workers
- Server-side rendering (SSR) migration
- Priority dataset workflow automation
- Bulk assignment capabilities
- Advanced analytics and reporting
