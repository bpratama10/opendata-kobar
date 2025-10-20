# Architecture - Open Data Platform

## System Overview

The Open Data Platform is a **full-stack web application** built with React frontend and Supabase backend. It follows a **client-side rendered (CSR)** architecture with server-side authorization through Row-Level Security (RLS) policies.

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (SPA)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Public   │  │    Admin     │  │  Data Management     │ │
│  │   Portal   │  │  Dashboard   │  │     (Tables)         │ │
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
│  │ PostgreSQL   │  │    Auth    │  │   Storage (future) │  │
│  │   + RLS      │  │  (JWT)     │  │                    │  │
│  └──────────────┘  └────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Application Structure

### Directory Layout

```
src/
├── assets/              # Static assets (images)
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   │   └── dataTables/ # Data table management components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client and types
├── lib/                # Utility functions
├── pages/              # Route components
│   └── admin/          # Admin pages
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
| `/admin` | Admin | All authenticated | Admin dashboard overview |
| `/admin/datasets` | AdminDatasets | PRODUSEN+ | Dataset list and management |
| `/admin/datasets/add` | AdminDatasetAdd | PRODUSEN+ | Create new dataset |
| `/admin/datasets/edit/:id` | AdminDatasetEdit | PRODUSEN+ | Edit existing dataset |
| `/admin/datasets/:id/tables` | AdminDataTables | PRODUSEN+ | Manage structured data tables |
| `/admin/users` | AdminUsers | ADMIN | User management |
| `/admin/organizations` | AdminOrganizations | ADMIN, WALIDATA | Organization management |
| `/admin/roles` | AdminRoles | ADMIN | Role management |
| `/admin/resources` | AdminResources | PRODUSEN+ | Resource management |
| `/admin/distributions` | AdminDistributions | PRODUSEN+ | Distribution management |
| `/admin/tags` | AdminTags | PRODUSEN+ | Tag management |
| `/admin/themes` | AdminThemes | WALIDATA+ | Theme management |
| `/admin/classifications` | AdminClassifications | WALIDATA+ | Classification codes |
| `/admin/licenses` | AdminLicenses | WALIDATA+ | License types |
| `/admin/frequency` | AdminFrequency | WALIDATA+ | Update frequencies |
| `/admin/analytics` | AdminAnalytics | WALIDATA+ | Usage analytics |
| `/admin/audit` | AdminAudit | WALIDATA+ | Audit logs |

**Role Hierarchy**: VIEWER < PRODUSEN < KOORDINATOR < WALIDATA < ADMIN

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

### 4. Complex Flow (Data Table Entry)

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
  - User can edit the parent dataset (via catalog_resources join)
  ↓
Upsert executes (UPDATE if exists, INSERT if not)
  ↓
Real-time subscription (if enabled) broadcasts change
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
useAuth() hook updates with user session
  ↓
User redirected to /admin
```

### Session Management

- **Storage**: localStorage (configurable in supabase/client.ts)
- **Token Type**: JWT (JSON Web Token)
- **Token Location**: Authorization header (Bearer token)
- **Token Refresh**: Automatic via Supabase SDK
- **Session Duration**: Configurable in Supabase dashboard (default 1 hour)

### Authorization Pattern

**CRITICAL SECURITY UPDATE (2024-10-20):**
- The `profiles.role` column has been **REMOVED** to prevent privilege escalation attacks
- Roles are now stored **ONLY** in `org_user_roles` table with strict RLS
- Users cannot modify their own roles via profile updates

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

## Performance Optimizations

### 1. Code Splitting
- React.lazy() for route-based splitting (future enhancement)
- Dynamic imports for heavy components

### 2. Query Optimization
- Select only required fields: `select('id, title, description')`
- Use indexes on frequently queried columns
- Limit results with `.limit(100)`

### 3. Caching Strategy
- TanStack Query default: 5 minutes stale time
- Manual invalidation after mutations
- Background refetch on window focus

### 4. Component Optimization
- useMemo for expensive computations
- useCallback for stable references
- React.memo for pure components (when needed)

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

## Future Enhancements

- Real-time subscriptions for collaborative editing
- Edge function integration for complex operations
- File storage for dataset attachments
- GraphQL API layer
- Advanced caching with service workers
- Server-side rendering (SSR) migration
