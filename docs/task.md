# Feature Updates & Tasks

## High Priority

### Dataset Telemetry & Analytics Implementation

**Status:** Pending  
**Priority:** High  
**Estimated Effort:** Medium

#### Description
Implement comprehensive logging and analytics for dataset interactions to support features like "Most Viewed" and accurate "Most Downloaded" sorting.

#### Current State
- ✅ `telemetry_downloads` table exists in database for tracking downloads
- ✅ `telemetry_audit_events` table exists for audit logging
- ❌ No view tracking implementation
- ❌ Download tracking not integrated with UI
- ❌ Mock data currently used for view counts in dataset list

#### Requirements

1. **View Tracking**
   - Create `telemetry_views` table or extend existing telemetry tables
   - Track page views for dataset detail pages
   - Include metadata: user_id, dataset_id, timestamp, session_info
   - Implement RLS policies for data access

2. **Download Tracking Integration**
   - Connect UI download actions to `telemetry_downloads` table
   - Track distribution_id, user_id, timestamp, channel (web/api)
   - Update dataset download counts in real-time or via scheduled aggregation

3. **Analytics Aggregation**
   - Create database functions/views to aggregate view counts by dataset
   - Create database functions/views to aggregate download counts by dataset
   - Consider caching strategy for performance (materialized views)

4. **UI Integration**
   - Update `useDatasets` hook to fetch real view/download counts
   - Remove mock viewCount data from DatasetList component
   - Implement "Most Viewed" sorting based on actual data
   - Update "Most Downloaded" sorting to use real download counts

5. **Admin Analytics Dashboard**
   - Display view/download statistics in admin panel
   - Show trending datasets
   - Export analytics data

#### Technical Notes
- Consider performance impact of real-time counting
- May need to implement rate limiting for view tracking
- Consider using database triggers for automatic count updates
- Evaluate privacy implications and GDPR compliance

#### Related Files
- `src/pages/DatasetList.tsx` - Currently uses mock view counts
- `src/hooks/useDatasets.ts` - Needs to fetch aggregated counts
- `src/components/SearchBar.tsx` - Implements sort by Most Viewed/Downloaded
- Database tables: `telemetry_downloads`, `telemetry_audit_events`

---

## Completed Features

### Security Hardening - Role System Refactor

**Status:** ✅ Completed  
**Completed Date:** 2024-10-20

#### Fixed Critical Security Issues
- Removed `profiles.role` column to prevent privilege escalation
- Removed `org_users.password_hash` to prevent credential exposure
- Updated all RLS policies and security definer functions
- Migrated all client code to use `org_user_roles` exclusively

#### Database Changes
- Dropped insecure columns from `profiles` and `org_users`
- Updated `has_role()` and `is_admin()` functions to use only `org_user_roles`
- Modified `handle_new_user` trigger for secure role assignment
- Added safe RLS policy for profile updates

#### Code Updates
- Updated `useAuth.ts`, `useRoleAccess.ts` hooks
- Modified admin components to use `orgRoles`
- Removed all references to deprecated `profile.role`

---

### Theme Management with Icons

**Status:** ✅ Completed  
**Completed Date:** 2024-10-17

#### Implemented Features
- Added `icon_url` column to `catalog_themes` table for SVG/PNG icon support
- Implemented theme update functionality in `/admin/themes`
- Implemented theme delete functionality with confirmation dialog
- Created edit dialog with live icon preview
- Updated home page to display themes with their custom icons
- Visual card layout showing icon, theme name, and dataset count
- Fallback to default globe icon when no custom icon is set

#### Database Changes
- Added `icon_url TEXT` column to `catalog_themes`
- Created RLS policies for update and delete operations on themes
- Authenticated users can now manage themes via admin panel

#### UI Components Modified
- `src/components/admin/ThemeManagement.tsx` - Full CRUD operations
- `src/pages/Index.tsx` - Theme icon display on home page

---

## Future Enhancements

### Search Optimization
- Implement full-text search
- Add fuzzy matching
- Search result highlighting

### Export Features
- Bulk dataset export
- Custom format conversion
- Scheduled exports

### API Development
- RESTful API for dataset access
- GraphQL endpoint
- API rate limiting and authentication
