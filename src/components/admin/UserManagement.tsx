import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserPlus, Shield, User, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface OrgUser {
  id: string;
  email: string;
  full_name: string;
  org_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
    short_name?: string;
  };
  roles?: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  profile?: {
    id: string;
    role: string;
  } | null;
  source: 'auth' | 'org' | 'both';
}

interface Organization {
  id: string;
  name: string;
  short_name?: string;
  org_type: "WALIDATA" | "PRODUSEN_DATA" | "KOORDINATOR" | "LAINNYA";
}

interface Role {
  id: string;
  code: string;
  name: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  
  const { orgRoles, profile, user: currentUser } = useAuth();
  
  // Define role hierarchy (highest to lowest)
  const roleHierarchy = ['ADMIN', 'KOORDINATOR', 'WALIDATA', 'PRODUSEN', 'VIEWER'];
  
  const getCurrentUserHighestRole = () => {
    // Check org roles only (profile.role removed for security)
    for (const role of roleHierarchy) {
      if (orgRoles.some(r => r.code === role)) {
        return role;
      }
    }
    return 'VIEWER'; // Default lowest role
  };
  
  // Add user form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserOrgName, setNewUserOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      // Fetch users from org_users with organization and roles
      const { data: usersData, error: usersError } = await supabase
        .from('org_users')
        .select(`
          *,
          organization:org_organizations(id, name, short_name),
          roles:org_user_roles(role_id, org_roles(id, code, name))
        `)
        
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Users fetch error:', usersError);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
        setUsers([]);
      } else {
        // Fetch corresponding profiles for each user (without role field)
        const userIds = (usersData || []).map(u => u.id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id')
          .in('id', userIds);

        // Create a map of profiles
        const profilesMap = new Map();
        (profilesData || []).forEach(profile => {
          profilesMap.set(profile.id, profile);
        });

        // Transform the data to match our interface
        const transformedUsers = (usersData || []).map(user => ({
          ...user,
          organization: user.organization,
          roles: user.roles?.map((r: any) => r.org_roles).filter(Boolean) || [],
          profile: profilesMap.get(user.id) || null,
          source: (profilesMap.has(user.id) && user.org_id) ? 'both' as const : 
                  (profilesMap.has(user.id) ? 'auth' as const : 'org' as const)
        }));
        setUsers(transformedUsers);
      }

      // Fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('org_organizations')
        .select('*')
        .order('name');

      if (orgsError) {
        console.error('Organizations fetch error:', orgsError);
      } else {
        setOrganizations(orgsData || []);
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('org_roles')
        .select('*')
        .order('name');

      if (rolesError) {
        console.error('Roles fetch error:', rolesError);
      } else {
        setRoles(rolesData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createUser = async () => {
    if (!newUserEmail || !newUserFullName || !selectedRoleId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let orgId = selectedOrgId;

      // Step 1: Create organization if new organization name is provided
      if (newUserOrgName.trim() && !selectedOrgId) {
        const { data: newOrg, error: orgError } = await supabase
          .from('org_organizations')
          .insert({
            name: newUserOrgName.trim(),
            org_type: 'PRODUSEN_DATA' as const // Default type
          })
          .select()
          .single();

        if (orgError) {
          console.error('Organization creation error:', orgError);
          toast({
            title: "Error",
            description: `Failed to create organization: ${orgError.message}`,
            variant: "destructive",
          });
          return;
        }

        orgId = newOrg.id;
        toast({
          title: "Success",
          description: `Organization "${newUserOrgName}" created`,
        });
      }

      if (!orgId) {
        toast({
          title: "Error",
          description: "Please select an organization or create a new one",
          variant: "destructive",
        });
        return;
      }

      // Step 2: Invite user via Supabase Auth (Admin-Create Flow)
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data: authUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        newUserEmail.trim(),
        {
          data: { 
            full_name: newUserFullName.trim() 
          },
          redirectTo: redirectUrl
        }
      );

      if (inviteError) {
        console.error('User invite error:', inviteError);
        toast({
          title: "Error",
          description: `Failed to invite user: ${inviteError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!authUser.user) {
        toast({
          title: "Error", 
          description: "Failed to create user account",
          variant: "destructive",
        });
        return;
      }

      // Step 3: Create/Update org_users record with the auth user ID
      const { data: newUser, error: userError } = await supabase
        .from('org_users')
        .upsert({
          id: authUser.user.id, // Use the auth user ID
          email: newUserEmail.trim(),
          full_name: newUserFullName.trim(),
          org_id: orgId,
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        console.error('User creation error:', userError);
        toast({
          title: "Error",
          description: `Failed to create user record: ${userError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Step 4: Assign role to user (remove existing roles first)
      await supabase
        .from('org_user_roles')
        .delete()
        .eq('user_id', authUser.user.id);

      const { error: roleError } = await supabase
        .from('org_user_roles')
        .insert({
          user_id: authUser.user.id,
          role_id: selectedRoleId
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
        toast({
          title: "Error",
          description: `Failed to assign role: ${roleError.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "User invited successfully! They will receive an email invitation.",
      });

      // Reset form
      setNewUserEmail("");
      setNewUserFullName("");
      setNewUserOrgName("");
      setSelectedOrgId("");
      setSelectedRoleId("");
      setShowAddUser(false);

      // Refresh data
      await fetchData();

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignOrganization = async (userId: string, orgId: string) => {
    try {
      const { error } = await supabase
        .from('org_users')
        .update({ org_id: orgId })
        .eq('id', userId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to assign organization",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Organization assigned successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error assigning organization:', error);
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      // Remove existing roles first
      await supabase
        .from('org_user_roles')
        .delete()
        .eq('user_id', userId);

      // Assign new role
      const { error } = await supabase
        .from('org_user_roles')
        .insert({
          user_id: userId,
          role_id: roleId
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to assign role",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Role assigned successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error assigning role:', error);
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('org_users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to deactivate user",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "User deactivated successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error deactivating user:', error);
    }
  };

  const activateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('org_users')
        .update({ is_active: true })
        .eq('id', userId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to activate user",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "User activated successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error activating user:', error);
    }
  };
  
  const canAssignRole = (targetRoleCode: string, targetUserId?: string) => {
    const currentUserRole = getCurrentUserHighestRole();
    
    // Admin can assign all roles, but can't modify their own role to prevent lockouts
    if (currentUserRole === 'ADMIN') {
      if (targetUserId && currentUser?.id && targetUserId === currentUser.id) {
        return false; // Can't modify own role
      }
      return true; // Can assign any role to others
    }
    
    // For non-admin users, follow hierarchy
    const currentUserLevel = roleHierarchy.indexOf(currentUserRole);
    const targetLevel = roleHierarchy.indexOf(targetRoleCode);
    
    // Can only assign roles lower than or equal to current user's role
    return targetLevel >= currentUserLevel;
  };

  const getAvailableRoles = (targetUserId?: string) => {
    return roles.filter(role => canAssignRole(role.code, targetUserId));
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminCount = users.filter(u => 
    u.roles?.some(role => role.code === 'ADMIN' || role.code === 'WALIDATA')
  ).length;

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage organization users and permissions</p>
        </div>
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <Label htmlFor="organization">Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} {org.short_name && `(${org.short_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newOrg">Or Create New Organization</Label>
                <Input
                  id="newOrg"
                  value={newUserOrgName}
                  onChange={(e) => {
                    setNewUserOrgName(e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedOrgId("");
                    }
                  }}
                  placeholder="Enter new organization name"
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={createUser} 
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Creating..." : "Create User"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddUser(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins/Walidata</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>Manage user accounts and roles</CardDescription>
          <div className="flex items-center space-x-2 mt-4">
            <Search className="w-4 h-4" />
            <Input
              placeholder="Search users by name, email, or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {user.roles?.some(r => r.code === 'ADMIN' || r.code === 'WALIDATA') ? (
                        <Shield className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">
                          {user.full_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {user.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                   <TableCell>
                     <div>
                       {user.org_id ? (
                         <>
                           <div className="font-medium">{user.organization?.name}</div>
                           {user.organization?.short_name && (
                             <div className="text-sm text-muted-foreground">
                               ({user.organization.short_name})
                             </div>
                           )}
                         </>
                       ) : (
                         <div className="text-sm text-muted-foreground">
                           <span className="text-orange-600">No Organization</span>
                           <div className="text-xs mt-1">
                             <Select 
                               value="" 
                               onValueChange={(orgId) => assignOrganization(user.id, orgId)}
                             >
                               <SelectTrigger className="h-6 w-32 text-xs">
                                 <SelectValue placeholder="Assign..." />
                               </SelectTrigger>
                               <SelectContent>
                                 {organizations.map((org) => (
                                   <SelectItem key={org.id} value={org.id}>
                                     {org.name}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </div>
                         </div>
                       )}
                     </div>
                   </TableCell>
                   <TableCell>
                     <div className="space-y-2">
                       <div className="flex flex-wrap gap-1">
                         {user.roles?.map((role) => (
                           <Badge 
                             key={role.id}
                             variant={role.code === 'ADMIN' || role.code === 'WALIDATA' ? "default" : "secondary"}
                             className="text-xs"
                           >
                             {role.name}
                           </Badge>
                         ))}
                       </div>
                        {user.is_active && (
                          <Select 
                            value="" 
                            onValueChange={(roleId) => assignRole(user.id, roleId)}
                            disabled={currentUser?.id ? user.id === currentUser.id : false} // Disable for current user
                          >
                            <SelectTrigger className="h-6 w-32 text-xs">
                              <SelectValue placeholder="Change role..." />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableRoles(user.id).map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                     </div>
                   </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                   <TableCell>
                     <div className="flex space-x-2">
                       {user.is_active ? (
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => deactivateUser(user.id)}
                         >
                           Deactivate
                         </Button>
                       ) : (
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => activateUser(user.id)}
                         >
                           Activate
                         </Button>
                       )}
                     </div>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}