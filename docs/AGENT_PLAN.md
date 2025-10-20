# Agent Plan - Open Data Platform

## Project Goals

Build a comprehensive **Open Data Portal** that enables:
- Public discovery and access to government/organizational datasets
- Role-based administration for dataset management
- Structured data tables with indicators and time-series data
- Full metadata cataloging following open data standards
- Multi-organizational support with granular access control

## Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library (Radix UI primitives)
- **Lucide React** - Icon library

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Row-Level Security (RLS) policies
  - Built-in authentication
  - Real-time subscriptions
- **Supabase Client** - Data fetching and mutations

### Design System
- HSL-based color tokens
- Professional blue (#2D7DD2) primary palette
- Teal (#29A398) secondary accent
- Semantic color variables for theming
- 12px border radius standard
- Custom card shadows and hover effects

## Core Features

### 1. Public Portal
- Dataset discovery and search
- Category/theme filtering
- Dataset detail pages with metadata
- Download tracking
- Responsive design

### 2. Authentication & Authorization
- Supabase Auth integration
- Role-based access control (RBAC)
- Five roles: ADMIN, WALIDATA, KOORDINATOR, PRODUSEN, VIEWER
- Organization-based permissions
- RLS policies for data security

### 3. Dataset Management
- CRUD operations for datasets
- Publication workflow (DRAFT → PENDING_REVIEW → PUBLISHED)
- Resource management (TABLE, FILE, API)
- Distribution tracking
- Tag and theme categorization
- Classification levels (PUBLIC, INTERNAL, CONFIDENTIAL)

### 4. Data Tables
- Structured indicator-based data entry
- Time-series period management
- Data grid with inline editing
- Bulk data import/export
- Data point versioning with qualifiers

### 5. Administration
- User management
- Organization management
- Role assignment
- Tag/theme/license management
- Analytics and audit logging

## Build Milestones

### Phase 1: Foundation (Completed)
✅ Project setup with Vite + React + TypeScript
✅ Supabase integration and database schema
✅ Authentication system
✅ Basic routing structure
✅ Design system and UI components

### Phase 2: Public Portal (Completed)
✅ Home page with dataset discovery
✅ Search and filtering
✅ Dataset detail pages
✅ Metadata display
✅ Responsive layouts

### Phase 3: Admin Foundation (Completed)
✅ Admin layout with sidebar navigation
✅ Role-based access control hooks
✅ Protected routes
✅ User management UI
✅ Organization management

### Phase 4: Dataset Management (Completed)
✅ Dataset CRUD operations
✅ Resource management
✅ Distribution tracking
✅ Tag and theme management
✅ Publication workflow
✅ Maintainers field

### Phase 5: Data Tables (Completed)
✅ Indicator management (rows)
✅ Period management (columns)
✅ Data entry grid
✅ Data point CRUD operations
✅ Real-time synchronization

### Phase 6: Enhancements (Current)
🔄 Hierarchical column headers (planned)
🔄 CSV/Excel import for data tables
🔄 Advanced analytics dashboard
🔄 Audit trail visualization

## Exact Build Order

### Database Layer (First)
1. Create enum types (publication_status, classification_type, resource_type, etc.)
2. Create core tables (catalog_metadata, catalog_resources, catalog_distributions)
3. Create reference tables (org_organizations, org_roles, catalog_tags, catalog_themes)
4. Create junction tables (catalog_dataset_tags, catalog_dataset_themes, org_user_roles)
5. Create data tables (data_indicators, data_points, data_table_view_columns)
6. Create telemetry tables (telemetry_downloads, telemetry_audit_events)
7. Implement RLS policies for each table
8. Create security definer functions (has_role, auth_org_id, is_admin)

### Backend Functions (Second)
1. Create helper functions for role checking
2. Implement RLS policies using security definer pattern
3. Set up indexes for performance
4. Create triggers for updated_at timestamps

### Frontend Foundation (Third)
1. Initialize Vite project with TypeScript
2. Install dependencies (React Router, TanStack Query, Tailwind, shadcn/ui)
3. Set up Supabase client
4. Create design system (index.css with HSL tokens)
5. Configure Tailwind with semantic colors
6. Set up routing structure (App.tsx)

### Authentication (Fourth)
1. Create Auth page with email/password login
2. Implement useAuth hook
3. Create profiles table and RLS policies
4. Add protected route wrapper
5. Implement useRoleAccess hook for permissions

### UI Components (Fifth)
1. Install shadcn/ui components (Button, Card, Input, Select, etc.)
2. Create Header component with navigation
3. Create SearchBar component
4. Create DataCard component
5. Build admin layout components (AdminLayout, AdminSidebar)

### Public Pages (Sixth)
1. Build Index page (home/discovery)
2. Implement dataset search and filtering
3. Create DatasetDetail page
4. Add metadata display
5. Implement download tracking

### Admin Pages (Seventh)
1. Create Admin dashboard
2. Build UserManagement page
3. Build OrganizationManagement page
4. Create DatasetManagement pages (list, add, edit)
5. Add ResourceManagement
6. Add DistributionManagement
7. Create reference data management (tags, themes, licenses)

### Data Tables Feature (Eighth)
1. Create DataTablesManagement page
2. Build IndicatorsManager component
3. Build PeriodsManager component
4. Create DataEntryGrid with inline editing
5. Implement useIndicators hook
6. Implement useDataPoints hook
7. Implement usePeriods hook
8. Add bulk operations

### Polish & Testing (Ninth)
1. Add loading states
2. Implement error handling
3. Add toast notifications
4. Optimize queries
5. Test RLS policies
6. Performance optimization
7. Accessibility improvements

## Key Architectural Decisions

### 1. No Third-Party Auth
- Use Supabase built-in authentication
- Store user profiles in separate `profiles` table
- Never store roles directly on profiles (security risk)
- Use `org_user_roles` junction table for RBAC

### 2. Security Definer Functions
- Prevent infinite recursion in RLS policies
- Create functions like `has_role()` with SECURITY DEFINER
- Use in RLS policies instead of direct table queries

### 3. Resource Types
- Support multiple resource types: TABLE, FILE, API, WEB
- TABLE resources have special handling for structured data
- Each resource can have multiple distributions

### 4. Publication Workflow
- DRAFT: Editable by PRODUSEN from same org
- PENDING_REVIEW: Under review, editable by WALIDATA
- PUBLISHED: Public, read-only (requires admin to unpublish)

### 5. Data Model
- Indicators = row dimension (e.g., population metrics)
- Periods = column dimension (e.g., years/quarters)
- Data points = intersection of indicator × period
- Support for qualifiers (OFFICIAL, PRELIMINARY, ESTIMATED)

## Development Workflow

1. **Database Changes**: Always start with migrations
2. **Type Generation**: Supabase CLI generates TypeScript types
3. **RLS Testing**: Test policies with different user roles
4. **Component Development**: Build UI components after backend is ready
5. **Hook Pattern**: Create custom hooks for all data fetching
6. **Parallel Development**: Multiple features can be built simultaneously once foundation is complete

## Success Metrics

- ✅ Public users can discover and download datasets
- ✅ Authenticated users can view additional datasets based on classification
- ✅ PRODUSEN users can create and edit their organization's datasets
- ✅ WALIDATA users can review and publish datasets
- ✅ ADMIN users have full system access
- ✅ Data tables support structured time-series data entry
- ✅ Audit trail tracks all significant actions
- ✅ System scales to thousands of datasets

## Next Steps

1. Implement hierarchical column headers for data tables (gender dimensions)
2. Add CSV/Excel import functionality
3. Build advanced analytics dashboard
4. Add spatial data support (maps)
5. Implement API endpoints for programmatic access
6. Add notification system for dataset updates
