import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckCircle2,
  Calendar,
  FileText,
  StickyNote,
  FolderOpen,
  Settings,
  Building2,
  Terminal,
  Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { useMembership } from "@/lib/membership";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const coreNavItems = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Projects", url: "/app/projects", icon: FolderKanban },
  { title: "Tasks", url: "/app/tasks", icon: CheckCircle2 },
  { title: "Calendar", url: "/app/calendar", icon: Calendar },
];

const knowledgeNavItems = [
  { title: "Documents", url: "/app/documents", icon: FileText },
  { title: "Notes", url: "/app/notes", icon: StickyNote },
  { title: "Folders", url: "/app/folders", icon: FolderOpen },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin, activeCompany } = useMembership();
  const collapsed = state === "collapsed";

  const showCompanyAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;
  const showSiteAdmin = isSiteAdmin || isSuperAdmin;

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(path);
  };

  const renderNavGroup = (
    label: string,
    items: typeof coreNavItems
  ) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
              >
                <NavLink
                  to={item.url}
                  end={item.url === "/app"}
                  className="flex items-center gap-3"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Logo showText={!collapsed} size={collapsed ? "sm" : "md"} />
      </SidebarHeader>

      {/* Active Company Badge */}
      {!collapsed && activeCompany && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activeCompany.name}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {isCompanyAdmin ? "Admin" : "User"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <SidebarContent className="px-2">
        {/* Core Navigation */}
        {renderNavGroup("Core", coreNavItems)}

        {/* Knowledge Navigation */}
        {renderNavGroup("Knowledge", knowledgeNavItems)}

        {/* Administration - consolidated admin consoles */}
        {showCompanyAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/app/admin/company-console")}
                    tooltip="Company Console"
                  >
                    <NavLink
                      to="/app/admin/company-console"
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <Building2 className="h-4 w-4" />
                      <span>Company Console</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {showSiteAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/app/admin/site-console")}
                      tooltip="Site Console"
                    >
                      <NavLink
                        to="/app/admin/site-console"
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Site Console</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/app/settings"}
              tooltip="Settings"
            >
              <NavLink
                to="/app/settings"
                className="flex items-center gap-3"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
