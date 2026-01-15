import * as React from "react";
import { useMembership } from "@/lib/membership";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Building2,
  Users,
  Boxes,
  Settings,
  ShieldCheck,
  Bug,
  Rocket,
  Database,
  ListTodo,
} from "lucide-react";
import { Link } from "react-router-dom";

// Import embedded panel components
import SitesPanel from "./site-console/SitesPanel";
import CompaniesPanel from "./site-console/CompaniesPanel";
import UsersPanel from "./site-console/UsersPanel";
import ModulesPanel from "./site-console/ModulesPanel";
import SiteSettingsPanel from "./site-console/SiteSettingsPanel";

// Dev tool panels (conditionally loaded)
import DbCheckPanel from "./site-console/DbCheckPanel";
import BootstrapPanel from "./site-console/BootstrapPanel";
import DevCompaniesPanel from "./site-console/DevCompaniesPanel";
import RlsTestPanel from "./site-console/RlsTestPanel";
import DeferredTasksPanel from "./site-console/DeferredTasksPanel";

const siteAdminSections = [
  { id: "sites", label: "Sites", icon: Shield },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "users", label: "All Users", icon: Users },
  { id: "modules", label: "Modules", icon: Boxes },
  { id: "settings", label: "Site Settings", icon: Settings },
];

const devToolSections = [
  { id: "db-check", label: "DB Check", icon: Database },
  { id: "bootstrap", label: "Bootstrap", icon: Rocket },
  { id: "dev-companies", label: "Companies (Dev)", icon: Building2 },
  { id: "rls-test", label: "RLS Test", icon: ShieldCheck },
  { id: "deferred", label: "Deferred Tasks", icon: ListTodo },
];

export default function SiteConsolePage() {
  const { isSiteAdmin, isSuperAdmin } = useMembership();
  const hasAccess = isSiteAdmin || isSuperAdmin;
  const showDevTools = import.meta.env.DEV;

  if (!hasAccess) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need Site Admin or Super Admin privileges to access this console."
        />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl">
      <PageHeader
        title="Site Administration Console"
        description="Centralized access to all site-level administration and development tools."
      />

      <div className="flex items-center gap-2 mb-6">
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          {isSuperAdmin ? "Super Admin" : "Site Admin"}
        </Badge>
        {showDevTools && (
          <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-500/10 gap-1">
            <Bug className="h-3 w-3" />
            Dev Mode
          </Badge>
        )}
      </div>

      <Tabs defaultValue="sites" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          {/* Site Admin Tabs */}
          {siteAdminSections.map((section) => (
            <TabsTrigger key={section.id} value={section.id} className="gap-2">
              <section.icon className="h-4 w-4" />
              {section.label}
            </TabsTrigger>
          ))}
          
          {/* Dev Tools Tabs - only in DEV mode */}
          {showDevTools && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              {devToolSections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="gap-2 text-amber-600 data-[state=active]:text-amber-700"
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </TabsTrigger>
              ))}
            </>
          )}
        </TabsList>

        {/* Site Admin Panels */}
        <TabsContent value="sites">
          <SitesPanel />
        </TabsContent>
        <TabsContent value="companies">
          <CompaniesPanel />
        </TabsContent>
        <TabsContent value="users">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="modules">
          <ModulesPanel />
        </TabsContent>
        <TabsContent value="settings">
          <SiteSettingsPanel />
        </TabsContent>

        {/* Dev Tools Panels */}
        {showDevTools && (
          <>
            <TabsContent value="db-check">
              <DbCheckPanel />
            </TabsContent>
            <TabsContent value="bootstrap">
              <BootstrapPanel />
            </TabsContent>
            <TabsContent value="dev-companies">
              <DevCompaniesPanel />
            </TabsContent>
            <TabsContent value="rls-test">
              <RlsTestPanel />
            </TabsContent>
            <TabsContent value="deferred">
              <DeferredTasksPanel />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
