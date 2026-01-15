import * as React from "react";
import { useMembership } from "@/lib/membership";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  UserCog,
  Briefcase,
  Shield,
  ShieldCheck,
  Users,
  MapPin,
} from "lucide-react";

// Import embedded panel components
import CompanySettingsPanel from "./company-console/CompanySettingsPanel";
import MembersPanel from "./company-console/MembersPanel";
import EmployeesPanel from "./company-console/EmployeesPanel";
import AuditLogPanel from "./company-console/AuditLogPanel";
import GroupsPanel from "./company-console/GroupsPanel";
import LocationsPanel from "./company-console/LocationsPanel";

const adminSections = [
  { id: "settings", label: "Settings", icon: Building2 },
  { id: "members", label: "Members", icon: UserCog },
  { id: "employees", label: "Employees", icon: Briefcase },
  { id: "groups", label: "Groups", icon: Users },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "audit", label: "Audit Log", icon: Shield },
];

export default function CompanyConsolePage() {
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin, activeCompanyId, activeCompany } = useMembership();
  const hasAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

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
          description="Please select a company to access administration tools."
        />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl">
      <PageHeader
        title="Company Administration"
        description={`Manage settings, members, and organization for ${activeCompany?.name || "your company"}.`}
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

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          {adminSections.map((section) => (
            <TabsTrigger key={section.id} value={section.id} className="gap-2">
              <section.icon className="h-4 w-4" />
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="settings">
          <CompanySettingsPanel />
        </TabsContent>
        <TabsContent value="members">
          <MembersPanel />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeesPanel />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsPanel />
        </TabsContent>
        <TabsContent value="locations">
          <LocationsPanel />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
