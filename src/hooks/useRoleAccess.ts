import { useAuth } from "@/hooks/useAuth";

export interface RolePermissions {
  canAccessAdmin: boolean;
  canViewOrganizations: boolean;
  canEditOrganizations: boolean;
  canManageUsers: boolean;
  canPublishDatasets: boolean;
  canEditDatasets: boolean;
  canViewAllDatasets: boolean;
  canDeleteDatasets: boolean;
  canViewAudit: boolean;
  canManageSystemSettings: boolean;
  isReadOnly: boolean;
}

export const useRoleAccess = () => {
  const { profile, orgRoles, loading } = useAuth();
  
  // Helper function to check if user has specific role
  const hasRole = (roleCode: string) => {
    return orgRoles.some(role => role.code === roleCode);
  };

  // Check if user is admin (org admin only - profile.role removed for security)
  const isAdmin = hasRole('ADMIN');
  
  // Check if user is WALIDATA
  const isWalidata = hasRole('WALIDATA');
  
  // Check if user is KOORDINATOR  
  const isKoordinator = hasRole('KOORDINATOR');
  
  // Check if user is PRODUSEN
  const isProdusen = hasRole('PRODUSEN');
  
  // Check if user is VIEWER
  const isViewer = hasRole('VIEWER');

  // Calculate permissions based on roles
  const permissions: RolePermissions = {
    // VIEWER blocked from admin, all others can access
    canAccessAdmin: !isViewer && (isAdmin || isWalidata || isKoordinator || isProdusen),
    
    // Organizations section: PRODUSEN can't see, KOORDINATOR read-only, WALIDATA can edit user roles
    canViewOrganizations: isAdmin || isWalidata || isKoordinator,
    canEditOrganizations: isAdmin, // Only admin can modify org settings
    
    // User management: Admin and WALIDATA can manage (WALIDATA limited to VIEWER↔PRODUSEN)
    canManageUsers: isAdmin || isWalidata,
    
    // Publishing: Only Admin and WALIDATA can publish/unpublish
    canPublishDatasets: isAdmin || isWalidata,
    
    // Dataset editing: PRODUSEN for own org, WALIDATA for any org, Admin all
    canEditDatasets: isAdmin || isWalidata || isProdusen,
    
    // Dataset viewing: KOORDINATOR and WALIDATA can view across orgs
    canViewAllDatasets: isAdmin || isWalidata || isKoordinator,
    
    // Dataset deletion: PRODUSEN for own org (DRAFT/PENDING_REVIEW), WALIDATA any, Admin all
    canDeleteDatasets: isAdmin || isWalidata || isProdusen,
    
    // Audit logs: All admin roles can view
    canViewAudit: isAdmin || isWalidata || isKoordinator || isProdusen,
    
    // System settings: Only Admin
    canManageSystemSettings: isAdmin,
    
    // Read-only mode: KOORDINATOR is read-only
    isReadOnly: isKoordinator
  };

  return {
    hasRole,
    isAdmin,
    isWalidata, 
    isKoordinator,
    isProdusen,
    isViewer,
    permissions,
    loading,
    userRoles: orgRoles,
    profile
  };
};