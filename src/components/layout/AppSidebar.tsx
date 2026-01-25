import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Settings, ChevronRight, Building2, Briefcase } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { useMembership } from "@/lib/membership";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useCompanyTerminology } from "@/hooks/useCompanyTerminology";
import { useNavState } from "@/hooks/useNavState";
import { useCoachingRoles } from "@/hooks/useCoachingRoles";
import { useCompanyModuleFlags, legacyModuleKeyToModuleId } from "@/core/modules";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  getNavigationSections,
  adminNavItems,
  coachingNavItems,
  getSectionForRoute,
  type NavItem,
  type NavSection,
} from "@/lib/navigationConfig";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin, activeCompany } = useMembership();
  const { isEnabled, loading: modulesLoading } = useCompanyModules();
  const { isModuleEnabled: isModuleFlagEnabled, isSafeMode } = useCompanyModuleFlags();
  const { getPlural } = useCompanyTerminology();
  const { isExpanded, toggleSection, expandSection } = useNavState();
  const coachingRoles = useCoachingRoles();
  const collapsed = state === "collapsed";
  
  // Get navigation sections based on finance mode
  const financeMode = activeCompany?.finance_mode;
  const navigationSections = getNavigationSections(financeMode);

  const showCompanyAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;
  const showSiteAdmin = isSiteAdmin || isSuperAdmin;

  // Auto-expand section when navigating to a deep link
  useEffect(() => {
    const section = getSectionForRoute(location.pathname);
    if (section) {
      expandSection(section);
    }
  }, [location.pathname, expandSection]);

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(path);
  };

  // Filter nav items based on both legacy module enablement AND new feature flags
  const filterItems = (items: NavItem[]): NavItem[] => {
    if (modulesLoading) return items;
    return items.filter((item) => {
      // Check legacy module system (company_modules table)
      if (item.moduleKey && !isEnabled(item.moduleKey)) {
        return false;
      }
      
      // Check new feature flags system
      if (item.moduleKey) {
        const moduleId = legacyModuleKeyToModuleId(item.moduleKey);
        if (moduleId && !isModuleFlagEnabled(moduleId)) {
          // In safe mode, hide non-core modules
          return false;
        }
      }
      
      return true;
    });
  };

  // Get the display title for a nav item (with terminology support)
  const getItemTitle = (item: NavItem): string => {
    if (item.terminologyKey) {
      return getPlural(item.terminologyKey);
    }
    return item.title;
  };

  // Render a collapsible section
  const renderSection = (section: NavSection) => {
    const visibleItems = filterItems(section.items);

    // Hide section if empty and configured to hide
    if (section.hideIfEmpty && visibleItems.length === 0) {
      return null;
    }

    // Dashboard section renders without collapsible
    if (section.key === "dashboard") {
      return (
        <SidebarGroup key={section.key}>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={getItemTitle(item)}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/app"}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{getItemTitle(item)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    const sectionExpanded = isExpanded(section.key);
    const hasActiveItem = visibleItems.some((item) => isActive(item.url));

    return (
      <SidebarGroup key={section.key}>
        <Collapsible open={sectionExpanded} onOpenChange={() => toggleSection(section.key)}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className={cn(
                "w-full justify-between",
                hasActiveItem && !sectionExpanded && "text-sidebar-accent-foreground"
              )}
              tooltip={section.title}
            >
              <div className="flex items-center gap-3">
                <section.icon className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider font-medium">
                  {section.title}
                </span>
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  sectionExpanded && "rotate-90"
                )}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent className="pl-4 pt-1">
              <SidebarMenu>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={getItemTitle(item)}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{getItemTitle(item)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  };

  // Render admin section
  const renderAdminSection = () => {
    if (!showCompanyAdmin) return null;

    const adminExpanded = isExpanded("admin");

    return (
      <SidebarGroup>
        <Collapsible open={adminExpanded} onOpenChange={() => toggleSection("admin")}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className="w-full justify-between"
              tooltip="Administration"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider font-medium">
                  Admin
                </span>
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  adminExpanded && "rotate-90"
                )}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent className="pl-4 pt-1">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(adminNavItems.companyConsole.url)}
                    tooltip={adminNavItems.companyConsole.title}
                  >
                    <NavLink
                      to={adminNavItems.companyConsole.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <adminNavItems.companyConsole.icon className="h-4 w-4" />
                      <span>{adminNavItems.companyConsole.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(adminNavItems.plansUsage.url)}
                    tooltip={adminNavItems.plansUsage.title}
                  >
                    <NavLink
                      to={adminNavItems.plansUsage.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <adminNavItems.plansUsage.icon className="h-4 w-4" />
                      <span>{adminNavItems.plansUsage.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(adminNavItems.integrations.url)}
                    tooltip={adminNavItems.integrations.title}
                  >
                    <NavLink
                      to={adminNavItems.integrations.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <adminNavItems.integrations.icon className="h-4 w-4" />
                      <span>{adminNavItems.integrations.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {showSiteAdmin && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(adminNavItems.siteConsole.url)}
                        tooltip={adminNavItems.siteConsole.title}
                      >
                        <NavLink
                          to={adminNavItems.siteConsole.url}
                          className="flex items-center gap-3"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <adminNavItems.siteConsole.icon className="h-4 w-4" />
                          <span>{adminNavItems.siteConsole.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(adminNavItems.coachingInspector.url)}
                        tooltip={adminNavItems.coachingInspector.title}
                      >
                        <NavLink
                          to={adminNavItems.coachingInspector.url}
                          className="flex items-center gap-3"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <adminNavItems.coachingInspector.icon className="h-4 w-4" />
                          <span>{adminNavItems.coachingInspector.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  };

  // Render coaching section
  const renderCoachingSection = () => {
    if (!coachingRoles.showCoachingSection) return null;

    const coachingExpanded = isExpanded("coaching");
    
    // Determine which items to show based on coaching roles
    const showOrgDashboard = coachingRoles.companyHasCoachingOrg && (isCompanyAdmin || coachingRoles.isOrgAdmin);
    const showCoachDashboard = coachingRoles.isCoachLike || coachingRoles.isOrgAdmin || coachingRoles.isManager;
    const showMemberDashboard = coachingRoles.companyHasCoachingOrg || coachingRoles.isMember;
    const showAdminDashboard = showSiteAdmin;

    // Don't show section if no items would be visible
    if (!showOrgDashboard && !showCoachDashboard && !showMemberDashboard && !showAdminDashboard) {
      return null;
    }

    return (
      <SidebarGroup>
        <Collapsible open={coachingExpanded} onOpenChange={() => toggleSection("coaching")}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className="w-full justify-between"
              tooltip="Coaching"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider font-medium">
                  Coaching
                </span>
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  coachingExpanded && "rotate-90"
                )}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent className="pl-4 pt-1">
              <SidebarMenu>
                {showOrgDashboard && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(coachingNavItems.orgDashboard.url)}
                      tooltip={coachingNavItems.orgDashboard.title}
                    >
                      <NavLink
                        to={coachingNavItems.orgDashboard.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <coachingNavItems.orgDashboard.icon className="h-4 w-4" />
                        <span>{coachingNavItems.orgDashboard.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {showCoachDashboard && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(coachingNavItems.coachDashboard.url)}
                      tooltip={coachingNavItems.coachDashboard.title}
                    >
                      <NavLink
                        to={coachingNavItems.coachDashboard.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <coachingNavItems.coachDashboard.icon className="h-4 w-4" />
                        <span>{coachingNavItems.coachDashboard.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {showMemberDashboard && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(coachingNavItems.memberDashboard.url)}
                      tooltip={coachingNavItems.memberDashboard.title}
                    >
                      <NavLink
                        to={coachingNavItems.memberDashboard.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <coachingNavItems.memberDashboard.icon className="h-4 w-4" />
                        <span>{coachingNavItems.memberDashboard.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {showAdminDashboard && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(coachingNavItems.adminDashboard.url)}
                      tooltip={coachingNavItems.adminDashboard.title}
                    >
                      <NavLink
                        to={coachingNavItems.adminDashboard.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <coachingNavItems.adminDashboard.icon className="h-4 w-4" />
                        <span>{coachingNavItems.adminDashboard.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
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
        {/* Render all navigation sections */}
        {navigationSections.map(renderSection)}

        {/* Coaching section */}
        {renderCoachingSection()}

        {/* Admin section */}
        {renderAdminSection()}
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
