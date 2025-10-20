# Security Model - Open Data Platform

## Overview

This document details the security architecture of the Open Data Platform, focusing on authentication, authorization, and data protection.

## Security Principles

1. **Defense in Depth**: Multiple layers of security (client, RLS, database constraints)
2. **Least Privilege**: Users only access what they need
3. **Secure by Default**: All tables have RLS enabled
4. **Zero Trust**: Never trust client-side data or checks

## Authentication

### Supabase Auth

Uses industry-standard JWT (JSON Web Token) authentication:

```
User Login
  ↓
Supabase Auth validates credentials
  ↓
Returns JWT access token + refresh token
  ↓
Tokens stored in localStorage
  ↓
All API requests include token in Authorization header
  ↓
Supabase validates token and extracts user ID (auth.uid())
  ↓
RLS policies use auth.uid() for authorization
```

### Session Management

- **Token Storage**: localStorage (can be configured for cookies)
- **Token Type**: JWT (signed by Supabase)
- **Token Duration**: 1 hour (configurable)
- **Refresh**: Automatic via Supabase SDK
- **Logout**: Clear tokens + invalidate session

## Authorization (Role-Based Access Control)

### CRITICAL: Secure Role Storage

**🚨 NEVER STORE ROLES IN USER TABLES** 

Storing roles in user-editable tables (like `profiles`) enables privilege escalation:

```sql
-- ❌ VULNERABLE: User can update their own profile
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
-- User just became admin!

-- ✅ SECURE: Roles in separate table with strict RLS
INSERT INTO org_user_roles (user_id, role_id)
VALUES (auth.uid(), (SELECT id FROM org_roles WHERE code = 'ADMIN'));
-- RLS policy prevents users from assigning themselves ADMIN role
```

### Role Architecture

```
┌──────────────┐
│  auth.users  │ (Supabase managed)
└──────┬───────┘
       │
       │ id = user_id
       ↓
┌──────────────────┐
│ org_user_roles   │ (Junction table)
│ - user_id        │
│ - role_id        │
└─────────┬────────┘
          │
          │ role_id
          ↓
┌──────────────────┐
│   org_roles      │ (Role definitions)
│ - id             │
│ - code (ADMIN)   │
│ - name           │
└──────────────────┘
```

### RLS Policies on org_user_roles

```sql
-- Only admins and WALIDATA can modify roles
CREATE POLICY "Role-based user role management"
ON org_user_roles FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    has_role('ADMIN')
    OR (
      has_role('WALIDATA') AND
      EXISTS (
        SELECT 1 FROM org_roles
        WHERE id = org_user_roles.role_id
        AND code IN ('VIEWER', 'PRODUSEN')
      )
    )
  )
);

-- Anyone authenticated can view roles (for UI)
CREATE POLICY "Authenticated users can view user roles"
ON org_user_roles FOR SELECT
USING (auth.uid() IS NOT NULL);
```

### Security Definer Functions

**Why Needed**: Prevent infinite recursion in RLS policies

Without security definer:
```sql
-- ❌ INFINITE RECURSION
CREATE POLICY "Check role" ON table_name
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  -- ↑ This queries profiles, which has RLS that might check roles...
);
```

With security definer:
```sql
-- ✅ SAFE - Bypasses RLS for role check only
CREATE FUNCTION has_role(_role_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER  -- ← Executes with function owner's privileges
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM org_user_roles ur
    JOIN org_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.code = _role_code
  );
$$;

CREATE POLICY "Check role" ON table_name
USING (has_role('ADMIN'));
```

### Role Hierarchy & Permissions

| Role | Code | Permissions |
|------|------|-------------|
| **Admin** | ADMIN | Full system access, user management, all datasets |
| **Data Steward** | WALIDATA | Publish datasets, manage organizations, view all |
| **Coordinator** | KOORDINATOR | View all datasets in organization |
| **Producer** | PRODUSEN | Create/edit own org's datasets (DRAFT/PENDING_REVIEW) |
| **Viewer** | VIEWER | Read-only access to internal datasets |

## Row-Level Security (RLS) Policies

### Dataset Access Control

```sql
-- Public datasets: Anyone can view
CREATE POLICY "Public dataset viewing"
ON catalog_metadata FOR SELECT
USING (
  publication_status = 'PUBLISHED' 
  AND classification_code = 'PUBLIC'
  AND deleted_at IS NULL
);

-- Private datasets: Role-based access
CREATE POLICY "Authenticated dataset viewing"
ON catalog_metadata FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Admins see everything
    has_role('ADMIN')
    OR
    -- WALIDATA sees all datasets
    has_role('WALIDATA')
    OR
    -- KOORDINATOR sees all in their org
    has_role('KOORDINATOR')
    OR
    -- Users see their own org's datasets
    publisher_org_id = auth_org_id()
  )
);

-- Dataset creation
CREATE POLICY "Dataset creation policy"
ON catalog_metadata FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR (
      has_role('PRODUSEN') 
      AND publisher_org_id = auth_org_id()
    )
  )
);

-- Dataset updates (only DRAFT/PENDING_REVIEW)
CREATE POLICY "Dataset update policy"
ON catalog_metadata FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    has_role('ADMIN')
    OR has_role('WALIDATA')
    OR (
      has_role('PRODUSEN')
      AND publisher_org_id = auth_org_id()
      AND publication_status IN ('DRAFT', 'PENDING_REVIEW')
    )
  )
)
WITH CHECK (/* same as USING */);
```

### Cascading Security

Resources, distributions, indicators, and data points inherit dataset security:

```sql
CREATE POLICY "Resource viewing policy"
ON catalog_resources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catalog_metadata m
    WHERE m.id = catalog_resources.dataset_id
    AND (
      -- Check if user can view parent dataset
      (m.publication_status = 'PUBLISHED' AND m.classification_code = 'PUBLIC')
      OR (auth.uid() IS NOT NULL AND (
        has_role('ADMIN')
        OR has_role('WALIDATA')
        OR has_role('KOORDINATOR')
        OR m.publisher_org_id = auth_org_id()
      ))
    )
  )
);
```

## Data Classification Levels

| Level | Code | Who Can Access |
|-------|------|----------------|
| **Public** | PUBLIC | Anyone (no authentication required) |
| **Internal** | INTERNAL | Authenticated users with appropriate roles |
| **Confidential** | CONFIDENTIAL | ADMIN and WALIDATA only |

## Publication Workflow

```
DRAFT
  ↓ (PRODUSEN can edit)
PENDING_REVIEW
  ↓ (WALIDATA reviews)
PUBLISHED ← (WALIDATA approves)
  ↓
Visible to public (if PUBLIC classification)
```

**Security Rules:**
- PRODUSEN can only edit DRAFT and PENDING_REVIEW
- WALIDATA can approve to PUBLISHED
- ADMIN can do anything
- Published datasets become read-only for PRODUSEN

## Audit Trail

### Tracking User Actions

```sql
-- Log significant events
INSERT INTO telemetry_audit_events (
  actor_id,
  action,
  object_type,
  object_id,
  context
) VALUES (
  auth.uid(),
  'PUBLISH',
  'dataset',
  dataset_id,
  jsonb_build_object(
    'from_status', 'PENDING_REVIEW',
    'to_status', 'PUBLISHED',
    'reason', 'Approved after review'
  )
);
```

### Audit Events

Tracked actions:
- CREATE: New resource created
- UPDATE: Resource modified
- DELETE: Resource soft-deleted
- PUBLISH: Dataset published
- UNPUBLISH: Dataset unpublished
- ASSIGN_ROLE: User role changed
- LOGIN: User login (via Supabase Auth)
- DOWNLOAD: Resource downloaded

## Download Tracking

```sql
INSERT INTO telemetry_downloads (
  distribution_id,
  user_id,
  channel,
  client_info
) VALUES (
  distribution_id,
  auth.uid(),
  'WEB',
  jsonb_build_object(
    'user_agent', user_agent_string,
    'ip_address', ip_address
  )
);
```

## Security Best Practices

### Frontend

```typescript
// ❌ NEVER do security checks client-side only
if (localStorage.getItem('isAdmin')) {
  // Client can modify localStorage!
}

// ❌ NEVER trust client data
const userRole = searchParams.get('role'); // Can be manipulated

// ✅ Use client checks for UI/UX only
const { hasRole } = useRoleAccess();
if (hasRole('ADMIN')) {
  return <AdminButton />; // Show/hide UI
}

// ✅ Always let RLS enforce security
const { data } = await supabase
  .from('catalog_metadata')
  .select('*');
// RLS automatically filters results
```

### Backend (RLS Policies)

```sql
-- ❌ NEVER rely on client-provided data
CREATE POLICY "Bad policy"
ON table_name FOR SELECT
USING (
  classification = current_setting('request.headers')::json->>'classification'
  -- Client can set request headers!
);

-- ✅ Use auth.uid() and security definer functions
CREATE POLICY "Good policy"
ON table_name FOR SELECT
USING (
  has_role('ADMIN') OR publisher_org_id = auth_org_id()
);
```

### Database

```sql
-- ✅ Always enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- ✅ Use constraints for data integrity
ALTER TABLE catalog_metadata
ADD CONSTRAINT valid_status 
CHECK (publication_status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED'));

-- ✅ Use triggers for automatic fields
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON catalog_metadata
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Common Security Vulnerabilities

### 1. Privilege Escalation ✅ FIXED

**Vulnerability**: User can update their own role
```sql
-- ❌ BEFORE: profiles.role column
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
```

**Fix**: Separate role table with strict RLS
```sql
-- ✅ AFTER: org_user_roles with RLS
-- RLS policy prevents self-assignment
INSERT INTO org_user_roles (user_id, role_id)
VALUES (auth.uid(), admin_role_id);
-- This will fail RLS check unless user is already admin
```

### 2. Data Exposure ✅ FIXED

**Vulnerability**: Password hashes visible in org_users
```sql
-- ❌ BEFORE: password_hash column
SELECT * FROM org_users; -- Exposes hashes
```

**Fix**: Remove sensitive columns
```sql
-- ✅ AFTER: No password_hash
-- Authentication handled by Supabase Auth (auth.users)
```

### 3. SQL Injection

**Protected**: Supabase client uses parameterized queries
```typescript
// ✅ SAFE - Supabase handles escaping
const { data } = await supabase
  .from('catalog_metadata')
  .select('*')
  .eq('title', userInput); // Automatically escaped
```

### 4. XSS (Cross-Site Scripting)

**Protected**: React escapes by default
```tsx
// ✅ SAFE - React escapes HTML
<div>{userInput}</div>

// ❌ UNSAFE - Use dangerouslySetInnerHTML carefully
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

## Monitoring & Alerts

### What to Monitor

1. **Failed Login Attempts**: Detect brute force attacks
2. **Role Changes**: Alert on admin role assignments
3. **Data Access Patterns**: Unusual bulk downloads
4. **RLS Policy Violations**: Log denied access attempts
5. **Database Errors**: Monitor constraint violations

### Logging Strategy

```typescript
// Client-side error logging
console.error('Security violation:', {
  userId: user?.id,
  action: 'unauthorized_access',
  resource: 'admin_panel',
  timestamp: new Date().toISOString()
});

// Server-side audit logging
await supabase.from('telemetry_audit_events').insert({
  actor_id: auth.uid(),
  action: 'ACCESS_DENIED',
  object_type: 'dataset',
  object_id: datasetId,
  context: { reason: 'Insufficient permissions' }
});
```

## Security Checklist

Before deploying changes:

- [ ] All new tables have RLS enabled
- [ ] All policies use security definer functions for role checks
- [ ] No roles stored in user-editable tables
- [ ] No sensitive data in responses (passwords, tokens)
- [ ] Client-side checks are UI-only, not security
- [ ] Audit logging for sensitive operations
- [ ] Input validation on both client and server
- [ ] Error messages don't leak system information
- [ ] Database constraints for data integrity
- [ ] Proper foreign key relationships

## Emergency Response

### Suspected Security Breach

1. **Immediate**: Revoke compromised user sessions
2. **Investigate**: Check audit logs for unauthorized access
3. **Contain**: Disable affected user accounts
4. **Notify**: Alert users if data was exposed
5. **Patch**: Fix vulnerability
6. **Review**: Conduct security audit

### Revoking User Access

```typescript
// Admin function to revoke user's access
await supabase.auth.admin.deleteUser(userId);

// Remove all roles
await supabase
  .from('org_user_roles')
  .delete()
  .eq('user_id', userId);

// Audit the action
await supabase.from('telemetry_audit_events').insert({
  actor_id: adminUserId,
  action: 'REVOKE_ACCESS',
  object_type: 'user',
  object_id: userId,
  context: { reason: 'Security incident' }
});
```

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Definer Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
