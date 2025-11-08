import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  Scale,
  ChevronLeft,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/lambang_opt.png";

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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isCollapsed, setIsCollapsed] = useState(!isDesktop);
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, isProdusen } = useRoleAccess();

  useEffect(() => {
    setIsCollapsed(!isDesktop);
  }, [isDesktop]);

  const getFilteredSections = () => {
    return menuItems.filter(section => {
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
        if (item.url === '/admin/priority-data') {
          return permissions.canViewPriorityData;
        }
        if (isProdusen && item.url.includes('/organizations')) {
          return false;
        }
        return true;
      })
    }));
  };

  return (
    <div
      className={cn(
        "relative h-full border-r bg-background transition-all duration-200",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with Logo */}
      <div className={cn(
        "flex items-center border-b p-4",
        isCollapsed ? "justify-center" : "justify-start"
      )}>
        <img
          src={logo}
          alt="Logo"
          className={cn(
            "object-contain",
            isCollapsed ? "h-8 w-8" : "h-10 w-10 mr-3"
          )}
        />
        {!isCollapsed && (
          <div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
            >
              <Home className="h-3 w-3 mr-1" />
              Halaman Depan
            </Button>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-[-15px] rounded-full bg-background hover:bg-muted z-10"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
      </Button>

      <div className="flex flex-col space-y-4 p-2">
        {getFilteredSections().map((section, index) => (
          <div key={section.label}>
            {!isCollapsed && (
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-1">
                {section.label}
              </h4>
            )}
            {isCollapsed && index > 0 && <div className="my-3 border-t"></div>}
            <div className="flex flex-col space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  title={isCollapsed ? item.title : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center p-2 rounded-lg text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed && "justify-center"
                    )
                  }
                >
                  <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span>{item.title}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
