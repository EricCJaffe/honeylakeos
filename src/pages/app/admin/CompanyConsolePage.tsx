import { useEffect, useRef } from "react";
import { useMembership } from "@/lib/membership";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  UserCog,
  Briefcase,
  ShieldCheck,
  Users,
  MapPin,
  ClipboardList,
  Languages,
  Boxes,
  Shield,
  FolderTree,
} from "lucide-react";

// Import embedded panel components
import CompanySettingsPanel from "./company-console/CompanySettingsPanel";
import MembersPanel from "./company-console/MembersPanel";
import EmployeesPanel from "./company-console/EmployeesPanel";
import AuditLogPanel from "./company-console/AuditLogPanel";
import GroupsPanel from "./company-console/GroupsPanel";
import LocationsPanel from "./company-console/LocationsPanel";
import CompanyModulesPanel from "./company-console/ModulesPanel";
import ModuleChecklistPanel from "./company-console/ModuleChecklistPanel";
import TerminologyPanel from "./company-console/TerminologyPanel";
import { CapabilitySettingsPanel } from "./company-console/CapabilitySettingsPanel";
import DepartmentsPanel from "./company-console/DepartmentsPanel";
import { FeatureFlagsPanel } from "@/core/modules";

const adminSections = [
  {
    id: "company",
    label: "Company",
    icon: Building2,
    description: "Manage company profile, branding, and general settings.",
  },
  {
    id: "members",
    label: "Members",
    icon: UserCog,
    description: "Manage user access, roles, and membership status for your organization.",
  },
  {
    id: "employees",
    label: "Employees",
    icon: Briefcase,
    description: "Manage employee records, send invitations, and track onboarding status.",
  },
  {
    id: "departments",
    label: "Departments",
    icon: FolderTree,
    description: "Create and manage departments with dedicated resources and workflows.",
  },
  {
    id: "groups",
    label: "Groups",
    icon: Users,
    description: "Organize members into teams and departments for easier management.",
  },
  {
    id: "locations",
    label: "Locations",
    icon: MapPin,
    description: "Manage physical locations, offices, and assign location managers.",
  },
  {
    id: "modules",
    label: "Modules",
    icon: Boxes,
    description: "Enable or disable feature modules for your company.",
  },
  {
    id: "capabilities",
    label: "Capabilities",
    icon: Shield,
    description: "Control what actions regular members can perform across modules.",
  },
  {
    id: "terminology",
    label: "Terminology",
    icon: Languages,
    description: "Customize labels for core concepts like clients, companies, and more.",
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: ClipboardList,
    description: "Review administrative actions and track changes across your organization.",
  },
];

export default function CompanyConsolePage() {
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin, activeCompanyId, activeCompany } = useMembership();
  const queryClient = useQueryClient();
  const previousCompanyId = useRef<string | null>(null);
  const hasAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  // Invalidate company-scoped queries when active company changes
  useEffect(() => {
    if (previousCompanyId.current && previousCompanyId.current !== activeCompanyId) {
      // Clear all company-scoped queries
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      queryClient.invalidateQueries({ queryKey: ["company-members"] });
      queryClient.invalidateQueries({ queryKey: ["company-modules"] });
      queryClient.invalidateQueries({ queryKey: ["company-module"] });
      queryClient.invalidateQueries({ queryKey: ["capability-settings"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
    }
    previousCompanyId.current = activeCompanyId;
  }, [activeCompanyId, queryClient]);

  if (!hasAccess) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ShieldCheck}
          title="Access Denied"
          description="You need Company Admin, Site Admin, or Super Admin privileges to access this console."
        />
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title="No Company Selected"
          description="Please select a company from the company switcher to access administration tools."
        />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl">
      <PageHeader
        title="Company Administration"
        description="Centralized management for your company settings, members, and organizational structure."
      />

      <div className="flex items-center gap-2 mb-6">
        <Badge variant="secondary" className="gap-1">
          <Building2 className="h-3 w-3" />
          {activeCompany?.name}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          {isSuperAdmin ? "Super Admin" : isSiteAdmin ? "Site Admin" : "Company Admin"}
        </Badge>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {adminSections.map((section) => (
            <TabsTrigger 
              key={section.id} 
              value={section.id} 
              className="gap-2 data-[state=active]:bg-background"
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {adminSections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="space-y-4">
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{section.label}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>

            {section.id === "company" && <CompanySettingsPanel />}
            {section.id === "members" && <MembersPanel />}
            {section.id === "employees" && <EmployeesPanel />}
            {section.id === "departments" && <DepartmentsPanel />}
            {section.id === "groups" && <GroupsPanel />}
            {section.id === "locations" && <LocationsPanel />}
            {section.id === "modules" && (
              <>
                <FeatureFlagsPanel />
                <CompanyModulesPanel />
                <ModuleChecklistPanel />
              </>
            )}
            {section.id === "capabilities" && <CapabilitySettingsPanel />}
            {section.id === "terminology" && <TerminologyPanel />}
            {section.id === "audit" && <AuditLogPanel />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
