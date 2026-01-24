import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  User,
  Building2,
  Users,
  MapPin,
  Boxes,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { useModuleAccess, ModuleKey, CORE_MODULES, PREMIUM_MODULES } from "@/hooks/useModuleAccess";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function StatusBadge({ status, label }: { status: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={status ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

function ModuleAccessCheck({ moduleKey }: { moduleKey: ModuleKey }) {
  const { isModuleEnabled, hasAccess, loading, moduleStatus } = useModuleAccess(moduleKey);
  const isCoreModule = CORE_MODULES.includes(moduleKey);

  if (loading) {
    return <Skeleton className="h-6 w-full" />;
  }

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <span className="font-medium capitalize">{moduleKey}</span>
        {isCoreModule && (
          <Badge variant="outline" className="text-[10px]">Core</Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className={isModuleEnabled ? "text-green-600" : "text-muted-foreground"}>
          {isModuleEnabled ? "Enabled" : "Not enabled"}
        </span>
        {moduleStatus && (
          <Badge variant="secondary" className="text-[10px]">{moduleStatus}</Badge>
        )}
        {hasAccess ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
      </div>
    </div>
  );
}

export default function PermissionsCheckPage() {
  const { user } = useAuth();
  const {
    memberships,
    siteMemberships,
    activeCompanyId,
    activeCompany,
    activeMembership,
    isSuperAdmin,
    isSiteAdmin,
    isCompanyAdmin,
    loading: membershipLoading,
  } = useMembership();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    roles: true,
    memberships: false,
    groups: false,
    locations: false,
    modules: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch groups the user belongs to
  const { data: userGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["user-groups", user?.id, activeCompanyId],
    queryFn: async () => {
      if (!user?.id || !activeCompanyId) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          role,
          groups!inner(id, name, company_id)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || [])
        .filter((gm: any) => gm.groups?.company_id === activeCompanyId)
        .map((gm: any) => ({
          id: gm.groups.id,
          name: gm.groups.name,
          role: gm.role,
        }));
    },
    enabled: !!user?.id && !!activeCompanyId,
  });

  // Fetch locations the user belongs to
  const { data: userLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["user-locations", user?.id, activeCompanyId],
    queryFn: async () => {
      if (!user?.id || !activeCompanyId) return [];
      const { data, error } = await supabase
        .from("location_members")
        .select(`
          role,
          locations!inner(id, name, company_id)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || [])
        .filter((lm: any) => lm.locations?.company_id === activeCompanyId)
        .map((lm: any) => ({
          id: lm.locations.id,
          name: lm.locations.name,
          role: lm.role,
        }));
    },
    enabled: !!user?.id && !!activeCompanyId,
  });

  if (membershipLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Not authenticated"
          description="Please log in to view permissions."
        />
      </div>
    );
  }

  if (!isCompanyAdmin && !isSiteAdmin && !isSuperAdmin) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need admin privileges to view this page."
        />
      </div>
    );
  }

  const allModules: ModuleKey[] = [...CORE_MODULES, ...PREMIUM_MODULES];

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title="Permissions Check"
        description="Debug view of your current access and permissions"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current User */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Current User</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {user.id.slice(0, 12)}...
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auth Provider</span>
              <span>{user.app_metadata?.provider || "email"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Company */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Active Company</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {activeCompany ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{activeCompany.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company ID</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {activeCompanyId?.slice(0, 12)}...
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{activeCompany.status}</Badge>
                </div>
                {activeMembership && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Role</span>
                    <Badge>{activeMembership.role}</Badge>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No company selected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Computed Roles */}
      <Collapsible
        open={expandedSections.roles}
        onOpenChange={() => toggleSection("roles")}
        className="mt-6"
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Computed Roles</CardTitle>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.roles ? "rotate-180" : ""
                  }`}
                />
              </div>
              <CardDescription>
                System-computed role flags based on your memberships
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 grid gap-3 sm:grid-cols-3">
              <StatusBadge status={isSuperAdmin} label="Super Admin" />
              <StatusBadge status={isSiteAdmin} label="Site Admin" />
              <StatusBadge status={isCompanyAdmin} label="Company Admin" />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Raw Memberships */}
      <Collapsible
        open={expandedSections.memberships}
        onOpenChange={() => toggleSection("memberships")}
        className="mt-4"
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Raw Memberships</CardTitle>
                  <Badge variant="secondary">{memberships.length + siteMemberships.length}</Badge>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.memberships ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {siteMemberships.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Site Memberships</h4>
                  <div className="space-y-1">
                    {siteMemberships.map((sm) => (
                      <div
                        key={sm.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <code className="text-xs">{sm.site_id.slice(0, 8)}...</code>
                        <Badge variant="outline">{sm.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {memberships.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Company Memberships</h4>
                  <div className="space-y-1">
                    {memberships.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          m.company_id === activeCompanyId
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{m.company_id.slice(0, 8)}...</code>
                          {m.company_id === activeCompanyId && (
                            <Badge variant="default" className="text-[10px]">Active</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{m.status}</Badge>
                          <Badge variant="outline">{m.role}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {memberships.length === 0 && siteMemberships.length === 0 && (
                <p className="text-sm text-muted-foreground">No memberships found.</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Group Access */}
      <Collapsible
        open={expandedSections.groups}
        onOpenChange={() => toggleSection("groups")}
        className="mt-4"
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Group Memberships</CardTitle>
                  <Badge variant="secondary">{userGroups.length}</Badge>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.groups ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {groupsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : userGroups.length > 0 ? (
                <div className="space-y-1">
                  {userGroups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <span>{g.name}</span>
                      <Badge variant={g.role === "manager" ? "default" : "outline"}>
                        {g.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not a member of any groups in this company.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Location Access */}
      <Collapsible
        open={expandedSections.locations}
        onOpenChange={() => toggleSection("locations")}
        className="mt-4"
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Location Memberships</CardTitle>
                  <Badge variant="secondary">{userLocations.length}</Badge>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.locations ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {locationsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : userLocations.length > 0 ? (
                <div className="space-y-1">
                  {userLocations.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <span>{l.name}</span>
                      <Badge variant={l.role === "manager" ? "default" : "outline"}>
                        {l.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not a member of any locations in this company.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Module Access */}
      <Collapsible
        open={expandedSections.modules}
        onOpenChange={() => toggleSection("modules")}
        className="mt-4"
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Module Access</CardTitle>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedSections.modules ? "rotate-180" : ""
                  }`}
                />
              </div>
              <CardDescription>
                Access check results using the same logic as route guards
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {allModules.map((moduleKey) => (
                  <ModuleAccessCheck key={moduleKey} moduleKey={moduleKey} />
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Debug Info */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Debug Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const debugInfo = {
                  userId: user.id,
                  email: user.email,
                  activeCompanyId,
                  isSuperAdmin,
                  isSiteAdmin,
                  isCompanyAdmin,
                  membershipsCount: memberships.length,
                  siteMembershipsCount: siteMemberships.length,
                  groupsCount: userGroups.length,
                  locationsCount: userLocations.length,
                };
                console.log("Permissions Debug Info:", debugInfo);
                navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
              }}
            >
              Copy Debug Info
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
