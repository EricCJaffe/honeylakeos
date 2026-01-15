import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, AlertTriangle, CheckCircle2, Shield, Users, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

interface GroupMembershipData {
  group_id: string;
  role: string;
  groups: {
    id: string;
    name: string;
    description: string | null;
    group_type: string | null;
  } | null;
}

export default function MyAccessPage() {
  const { user } = useAuth();
  const { 
    activeCompanyId, 
    activeCompany, 
    memberships, 
    siteMemberships, 
    isCompanyAdmin,
    isSiteAdmin,
    isSuperAdmin,
    loading: membershipLoading 
  } = useMembership();

  // Get the current company membership
  const currentMembership = memberships.find(m => m.company_id === activeCompanyId);

  // Fetch group memberships for the current user in the active company
  const { data: groupMemberships, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ["my-group-memberships", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!user?.id || !activeCompanyId) return [];
      
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          group_id,
          role,
          groups!inner (
            id,
            name,
            description,
            group_type,
            company_id
          )
        `)
        .eq("user_id", user.id);

      if (error) {
        // Check for RLS policy error
        if (error.code === "42501") {
          console.error("RLS Policy Error fetching group memberships:", error);
          throw new Error("ACCESS_BLOCKED");
        }
        console.error("Error fetching group memberships:", error);
        throw error;
      }

      // Filter to only groups in the active company
      const filtered = (data || []).filter((gm: any) => 
        gm.groups?.company_id === activeCompanyId
      );

      return filtered as GroupMembershipData[];
    },
    enabled: !!user?.id && !!activeCompanyId,
  });

  // Assemble debug object
  const debugData = {
    user: user ? { id: user.id, email: user.email } : null,
    activeCompany: activeCompany ? { id: activeCompany.id, name: activeCompany.name } : null,
    membership: currentMembership ? {
      id: currentMembership.id,
      role: currentMembership.role,
      status: currentMembership.status,
      member_type: currentMembership.member_type,
      created_at: currentMembership.created_at,
    } : null,
    siteMemberships: siteMemberships.map(sm => ({
      site_id: sm.site_id,
      role: sm.role,
    })),
    groupMemberships: (groupMemberships || []).map(gm => ({
      group_id: gm.group_id,
      group_name: gm.groups?.name,
      role: gm.role,
    })),
    computedRoles: {
      isCompanyAdmin,
      isSiteAdmin,
      isSuperAdmin,
    },
  };

  const handleCopyDebug = () => {
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    toast.success("Debug JSON copied to clipboard");
  };

  const isLoading = membershipLoading || groupsLoading;

  const KeyValueRow = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <PageHeader
        title="My Access"
        description="View your current roles, permissions, and group memberships"
      />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleCopyDebug}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Debug JSON
        </Button>
      </div>

      {/* Current User */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Current User
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <>
              <KeyValueRow label="User ID" value={user?.id || "—"} mono />
              <KeyValueRow label="Email" value={user?.email || "—"} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Active Company */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Active Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : activeCompany ? (
            <>
              <KeyValueRow label="Company ID" value={activeCompany.id} mono />
              <KeyValueRow label="Name" value={activeCompany.name} />
              <KeyValueRow label="Status" value={
                <Badge variant={activeCompany.status === "active" ? "default" : "secondary"}>
                  {activeCompany.status}
                </Badge>
              } />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active company selected</p>
          )}
        </CardContent>
      </Card>

      {/* Company Membership */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Company Membership
          </CardTitle>
          <CardDescription>Your membership in the active company</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : currentMembership ? (
            <>
              <KeyValueRow 
                label="Role" 
                value={
                  <Badge variant={currentMembership.role === "company_admin" ? "default" : "secondary"}>
                    {currentMembership.role}
                  </Badge>
                } 
              />
              <KeyValueRow 
                label="Status" 
                value={
                  <Badge variant={currentMembership.status === "active" ? "outline" : "secondary"}>
                    {currentMembership.status}
                  </Badge>
                } 
              />
              <KeyValueRow label="Member Type" value={currentMembership.member_type} />
              <KeyValueRow 
                label="Member Since" 
                value={new Date(currentMembership.created_at).toLocaleDateString()} 
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No membership found for active company</p>
          )}
        </CardContent>
      </Card>

      {/* Computed Roles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Computed Access Flags
          </CardTitle>
          <CardDescription>Derived from your memberships</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Company Admin</span>
                  <Badge variant={isCompanyAdmin ? "default" : "outline"}>
                    {isCompanyAdmin ? "Yes" : "No"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Can manage employees, groups, locations, and company settings. Full access to all company data.
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Site Admin</span>
                  <Badge variant={isSiteAdmin ? "default" : "outline"}>
                    {isSiteAdmin ? "Yes" : "No"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Can manage multiple companies within a site. Has company admin access to all companies in their site.
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Super Admin</span>
                  <Badge variant={isSuperAdmin ? "default" : "outline"}>
                    {isSuperAdmin ? "Yes" : "No"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Platform-level administrator with full access to all sites, companies, and system settings.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Site Memberships */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Site Memberships
          </CardTitle>
          <CardDescription>Platform-level admin roles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
            </div>
          ) : siteMemberships.length > 0 ? (
            <div className="space-y-3">
              {siteMemberships.map((sm) => (
                <div key={sm.id} className="p-3 rounded-md bg-muted/50">
                  <KeyValueRow label="Site ID" value={sm.site_id} mono />
                  <KeyValueRow 
                    label="Role" 
                    value={
                      <Badge variant="default">{sm.role}</Badge>
                    } 
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No site-level memberships</p>
          )}
        </CardContent>
      </Card>

      {/* Group Memberships */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Memberships
          </CardTitle>
          <CardDescription>Groups you belong to in the active company</CardDescription>
        </CardHeader>
        <CardContent>
          {groupsError?.message === "ACCESS_BLOCKED" ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Access Blocked by RLS</AlertTitle>
              <AlertDescription>
                Unable to fetch group memberships. Check console for details.
              </AlertDescription>
            </Alert>
          ) : groupsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (groupMemberships || []).length > 0 ? (
            <div className="space-y-3">
              {groupMemberships!.map((gm) => (
                <div key={gm.group_id} className="p-3 rounded-md bg-muted/50">
                  <KeyValueRow label="Group" value={gm.groups?.name || "Unknown"} />
                  <KeyValueRow label="Group ID" value={gm.group_id} mono />
                  <KeyValueRow 
                    label="Your Role" 
                    value={
                      <Badge variant={gm.role === "manager" ? "default" : "secondary"}>
                        {gm.role}
                      </Badge>
                    } 
                  />
                  {gm.groups?.group_type && (
                    <KeyValueRow label="Type" value={gm.groups.group_type} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not a member of any groups in this company</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
