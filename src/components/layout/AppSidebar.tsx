import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckCircle2,
  Calendar,
  FileText,
  StickyNote,
  FolderOpen,
  FormInput,
  Workflow,
  Users,
  Settings,
  Building2,
  UserCog,
  Shield,
  Boxes,
  Rocket,
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

const automationNavItems = [
  { title: "Forms", url: "/app/forms", icon: FormInput },
  { title: "Workflows", url: "/app/workflows", icon: Workflow },
];

const orgNavItems = [
  { title: "Groups", url: "/app/groups", icon: Users },
];

const companyAdminItems = [
  { title: "Company Settings", url: "/app/admin/company", icon: Building2 },
  { title: "Members", url: "/app/admin/members", icon: UserCog },
];

const siteAdminItems = [
  { title: "Sites", url: "/app/admin/sites", icon: Shield },
  { title: "Companies", url: "/app/admin/companies", icon: Building2 },
  { title: "All Users", url: "/app/admin/users", icon: Users },
  { title: "Modules", url: "/app/admin/modules", icon: Boxes },
  { title: "Site Settings", url: "/app/admin/settings", icon: Settings },
];

const devItems = [
  { title: "DB Check", url: "/app/dev/db-check", icon: Settings },
  { title: "Bootstrap", url: "/app/dev/bootstrap", icon: Rocket },
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

        {/* Automation Navigation */}
        {renderNavGroup("Automation", automationNavItems)}

        {/* Organization Navigation */}
        {renderNavGroup("Organization", orgNavItems)}

        {/* Company Admin Navigation */}
        {showCompanyAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {companyAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
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
        )}

        {/* Site Admin Navigation */}
        {showSiteAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-primary/80">
              Site Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {siteAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
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
        )}

        {/* Dev Tools (only in development) */}
        {import.meta.env.DEV && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Dev Tools
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {devItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
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
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/app/settings")}
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
