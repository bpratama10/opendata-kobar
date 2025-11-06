import { NavLink, useLocation } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  Database,
  Users,
  FileText,
  Tags,
  Building,
  Settings,
  BarChart3,
  Shield,
  Globe,
  Download,
  Clock,
  Scale
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: BarChart3 },
    ]
  },
  {
    label: "Data Management",
    items: [
      { title: "Datasets", url: "/admin/datasets", icon: Database },
      { title: "Priority Data", url: "/admin/priority-data", icon: Shield },
      { title: "Resources", url: "/admin/resources", icon: FileText },
      { title: "Distributions", url: "/admin/distributions", icon: Download },
    ]
  },
  {
    label: "Organization",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Organizations", url: "/admin/organizations", icon: Building },
      { title: "Roles", url: "/admin/roles", icon: Shield },
    ]
  },
  {
    label: "Taxonomy",
    items: [
      { title: "Tags", url: "/admin/tags", icon: Tags },
      { title: "Themes", url: "/admin/themes", icon: Globe },
      { title: "Classifications", url: "/admin/classifications", icon: Scale },
      { title: "Licenses", url: "/admin/licenses", icon: FileText },
      { title: "Update Frequency", url: "/admin/frequency", icon: Clock },
    ]
  },
  {
    label: "System",
    items: [
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
      { title: "API Keys", url: "/admin/api-keys", icon: Settings },
      { title: "Audit Log", url: "/admin/audit", icon: Settings },
    ]
  }
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { permissions, isProdusen } = useRoleAccess();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return currentPath === "/admin";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center w-full ${isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`;

  // Filter menu items based on role permissions
  const getFilteredSections = () => {
    return menuItems.filter(section => {
      // Filter sections based on role
      if (section.label === "Organization" && !permissions.canViewOrganizations) {
        return false;
      }
      if (section.label === "System" && !permissions.canManageSystemSettings) {
        return false;
      }
      return true;
    }).map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Priority Data only for ADMIN, KOORDINATOR, WALIDATA
        if (item.url === '/admin/priority-data') {
          return permissions.canViewPriorityData;
        }
        // PRODUSEN cannot see Organizations
        if (isProdusen && item.url.includes('/organizations')) {
          return false;
        }
        return true;
      })
    }));
  };

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        {getFilteredSections().map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
