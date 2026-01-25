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
  Globe,
  ClipboardList,
  Lock,
} from "lucide-react";

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
  {
    id: "platform",
    label: "Platform",
    icon: Globe,
    description: "Manage platform-wide sites and global configuration settings.",
  },
  {
    id: "companies",
    label: "Companies",
    icon: Building2,
    description: "View and manage all companies registered on the platform.",
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: ClipboardList,
    description: "Review platform-wide administrative actions and security events.",
  },
  {
    id: "security",
    label: "Security/RLS",
    icon: Lock,
    description: "Review Row Level Security policies and access control configurations.",
  },
];

const devToolSections = [
  {
    id: "dev-tools",
    label: "Dev Tools",
    icon: Bug,
    description: "Development utilities for testing, debugging, and system diagnostics.",
  },
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
        description="Centralized access to platform management, security, and development tools."
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

      {/* Dev Tasks Panel - Always visible at top for site admins */}
      <div className="mb-6">
        <DeferredTasksPanel />
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {/* Site Admin Tabs */}
          {siteAdminSections.map((section) => (
            <TabsTrigger 
              key={section.id} 
              value={section.id} 
              className="gap-2 data-[state=active]:bg-background"
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </TabsTrigger>
          ))}
          
          {/* Dev Tools Tab - only in DEV mode */}
          {showDevTools && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              {devToolSections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="gap-2 text-amber-600 data-[state=active]:text-amber-700 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-950/30"
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </TabsTrigger>
              ))}
            </>
          )}
        </TabsList>

        {/* Platform Tab */}
        <TabsContent value="platform" className="space-y-4">
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Platform</CardTitle>
              </div>
              <CardDescription>
                Manage platform-wide sites and global configuration settings.
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <SitesPanel />
            <SiteSettingsPanel />
          </div>
          <UsersPanel />
          <ModulesPanel />
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Companies</CardTitle>
              </div>
              <CardDescription>
                View and manage all companies registered on the platform.
              </CardDescription>
            </CardHeader>
          </Card>
          <CompaniesPanel />
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Audit Logs</CardTitle>
              </div>
              <CardDescription>
                Review platform-wide administrative actions and security events.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={ClipboardList}
                title="Platform Audit Logs"
                description="Platform-wide audit logging coming soon. Currently, audit logs are available per-company in the Company Console."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security/RLS Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Security & RLS</CardTitle>
              </div>
              <CardDescription>
                Review Row Level Security policies and access control configurations.
              </CardDescription>
            </CardHeader>
          </Card>
          {showDevTools ? (
            <RlsTestPanel />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={Lock}
                  title="Security Overview"
                  description="Security and RLS testing tools are available in development mode."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dev Tools Tab - only in DEV mode */}
        {showDevTools && (
          <TabsContent value="dev-tools" className="space-y-4">
            <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-lg text-amber-700 dark:text-amber-500">Development Tools</CardTitle>
                </div>
                <CardDescription>
                  Utilities for testing, debugging, and system diagnostics. Only available in development mode.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <CardTitle className="text-base">Database Check</CardTitle>
                  </div>
                  <CardDescription>Verify database schema and connectivity.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DbCheckPanel />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5" />
                    <CardTitle className="text-base">Bootstrap</CardTitle>
                  </div>
                  <CardDescription>Initialize platform data and first-time setup.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BootstrapPanel />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <CardTitle className="text-base">Test Companies</CardTitle>
                  </div>
                  <CardDescription>Create and manage test company data.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DevCompaniesPanel />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    <CardTitle className="text-base">Deferred Tasks</CardTitle>
                  </div>
                  <CardDescription>View and manage background processing tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DeferredTasksPanel />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
