import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckCircle2,
  Calendar,
  FileText,
  StickyNote,
  Settings,
  Building2,
  Shield,
  Globe,
  Workflow,
  BookOpen,
  Users,
  Contact,
  UserCheck,
  CreditCard,
  Compass,
  HelpCircle,
  Ticket,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { useMembership } from "@/lib/membership";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { Badge } from "@/components/ui/badge";
import { ModuleKey } from "@/hooks/useModuleAccess";
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

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: ModuleKey;
}

const coreNavItems: NavItem[] = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Projects", url: "/app/projects", icon: FolderKanban, moduleKey: "projects" },
  { title: "Tasks", url: "/app/tasks", icon: CheckCircle2, moduleKey: "tasks" },
  { title: "Calendar", url: "/app/calendar", icon: Calendar, moduleKey: "calendar" },
];

const knowledgeNavItems: NavItem[] = [
  { title: "Documents", url: "/app/documents", icon: FileText, moduleKey: "documents" },
  { title: "Notes", url: "/app/notes", icon: StickyNote, moduleKey: "notes" },
];

const crmNavItems: NavItem[] = [
  { title: "CRM", url: "/app/crm", icon: Users, moduleKey: "crm" },
  { title: "Contacts", url: "/app/contacts", icon: Contact, moduleKey: "crm" }, // Uses CRM module
  { title: "Coaches", url: "/app/coaches", icon: UserCheck, moduleKey: "coaches" },
];

const premiumNavItems: NavItem[] = [
  { title: "Framework", url: "/app/framework", icon: Compass },
  { title: "Forms", url: "/app/forms", icon: Globe, moduleKey: "forms" },
  { title: "Workflows", url: "/app/workflows", icon: Workflow, moduleKey: "workflows" },
  { title: "LMS", url: "/app/lms", icon: BookOpen, moduleKey: "lms" },
];

const supportNavItems: NavItem[] = [
  { title: "Help Center", url: "/app/support/kb", icon: HelpCircle },
  { title: "My Tickets", url: "/app/support/tickets", icon: Ticket },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin, activeCompany } = useMembership();
  const { isEnabled, loading: modulesLoading } = useCompanyModules();
  const collapsed = state === "collapsed";

  const showCompanyAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;
  const showSiteAdmin = isSiteAdmin || isSuperAdmin;

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(path);
  };

  // Filter nav items based on module enablement
  const filterByModuleAccess = (items: NavItem[]): NavItem[] => {
    if (modulesLoading) return items; // Show all while loading
    return items.filter(item => !item.moduleKey || isEnabled(item.moduleKey));
  };

  const visibleCoreItems = filterByModuleAccess(coreNavItems);
  const visibleKnowledgeItems = filterByModuleAccess(knowledgeNavItems);
  const visibleCrmItems = filterByModuleAccess(crmNavItems);
  const visiblePremiumItems = filterByModuleAccess(premiumNavItems);

  const renderNavGroup = (
    label: string,
    items: NavItem[]
  ) => {
    if (items.length === 0) return null;
    
    return (
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
  };

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
        {renderNavGroup("Core", visibleCoreItems)}

        {/* Knowledge Navigation */}
        {renderNavGroup("Knowledge", visibleKnowledgeItems)}

        {/* CRM Navigation */}
        {renderNavGroup("CRM", visibleCrmItems)}

        {/* Premium Modules - only show if any are enabled */}
        {renderNavGroup("Premium", visiblePremiumItems)}

        {/* Support */}
        {renderNavGroup("Support", supportNavItems)}

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

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/app/admin/plans-usage")}
                    tooltip="Plans & Usage"
                  >
                    <NavLink
                      to="/app/admin/plans-usage"
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Plans & Usage</span>
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
