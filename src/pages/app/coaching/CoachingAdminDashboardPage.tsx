import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CoachingDashboardLayout } from "@/components/coaching/CoachingDashboardLayout";
import { CoachingAccessGuard } from "@/components/coaching/CoachingAccessGuard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  Users,
  UserCheck,
  Settings,
  ArrowRight,
  AlertTriangle,
  Database,
  Shield,
} from "lucide-react";

interface CoachingOrgSummary {
  id: string;
  name: string;
  status: string;
  program_key: string | null;
  program_version: string | null;
  company_id: string;
  company_name: string;
  engagement_count: number;
  coach_count: number;
  manager_count: number;
}

function useCoachingAdminData() {
  return useQuery({
    queryKey: ["coaching-admin-overview"],
    queryFn: async () => {
      // Get all coaching orgs
      const { data: orgs, error: orgsError } = await supabase
        .from("coaching_orgs")
        .select(`
          id,
          name,
          status,
          program_key,
          program_version,
          company_id,
          company:companies(name)
        `)
        .order("name");

      if (orgsError) throw orgsError;

      // Get engagement counts per org
      const { data: engagementCounts } = await supabase
        .from("coaching_org_engagements")
        .select("coaching_org_id")
        .eq("status", "active");

      // Get coach counts per org
      const { data: coachCounts } = await supabase
        .from("coaching_coaches")
        .select("coaching_org_id")
        .eq("status", "active");

      // Get manager counts per org
      const { data: managerCounts } = await supabase
        .from("coaching_managers")
        .select("coaching_org_id")
        .eq("status", "active");

      // Aggregate counts
      const engagementsByOrg = (engagementCounts || []).reduce((acc, e) => {
        acc[e.coaching_org_id] = (acc[e.coaching_org_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const coachesByOrg = (coachCounts || []).reduce((acc, c) => {
        acc[c.coaching_org_id] = (acc[c.coaching_org_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const managersByOrg = (managerCounts || []).reduce((acc, m) => {
        acc[m.coaching_org_id] = (acc[m.coaching_org_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const summary: CoachingOrgSummary[] = (orgs || []).map((org) => ({
        id: org.id,
        name: org.name,
        status: org.status,
        program_key: org.program_key,
        program_version: org.program_version,
        company_id: org.company_id,
        company_name: (org.company as any)?.name || "Unknown",
        engagement_count: engagementsByOrg[org.id] || 0,
        coach_count: coachesByOrg[org.id] || 0,
        manager_count: managersByOrg[org.id] || 0,
      }));

      return {
        orgs: summary,
        totals: {
          orgs: summary.length,
          activeOrgs: summary.filter((o) => o.status === "active").length,
          totalEngagements: Object.values(engagementsByOrg).reduce((a, b) => a + b, 0),
          totalCoaches: Object.values(coachesByOrg).reduce((a, b) => a + b, 0),
          totalManagers: Object.values(managersByOrg).reduce((a, b) => a + b, 0),
        },
      };
    },
  });
}

function CoachingAdminContent() {
  const { data, isLoading, error } = useCoachingAdminData();

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive">Failed to load coaching admin data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <CoachingDashboardLayout
      title="Coaching Admin Dashboard"
      description="Site-wide coaching system overview"
      isLoading={isLoading}
      headerActions={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/app/admin/coaching-inspector">
              <Database className="h-4 w-4 mr-2" />
              Inspector
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/admin/coaching-debug">
              <Settings className="h-4 w-4 mr-2" />
              Debug
            </Link>
          </Button>
        </div>
      }
    >
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coaching Orgs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totals.orgs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.totals.activeOrgs || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Engagements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totals.totalEngagements || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Coaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totals.totalCoaches || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Managers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totals.totalManagers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coach Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              View in Debug
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coaching Organizations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Coaching Organizations
              </CardTitle>
              <CardDescription>All registered coaching organizations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !data?.orgs.length ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No coaching organizations found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.orgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{org.name}</p>
                        <Badge variant={org.status === "active" ? "default" : "secondary"}>
                          {org.status}
                        </Badge>
                        {org.program_key && (
                          <Badge variant="outline" className="text-xs">
                            {org.program_key} v{org.program_version || "1"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Company: {org.company_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{org.engagement_count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{org.coach_count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Coaches</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/app/admin/coaching-inspector?org=${org.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Schema Inspection</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/app/admin/coaching-debug">
                <Database className="h-4 w-4 mr-2" />
                View Schema & Data
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">RLS & Security</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/app/dev/rls-test">
                <Shield className="h-4 w-4 mr-2" />
                Test RLS Policies
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/app/health">
                <Settings className="h-4 w-4 mr-2" />
                Health Check
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </CoachingDashboardLayout>
  );
}

export default function CoachingAdminDashboardPage() {
  return (
    <CoachingAccessGuard requiredAccess="site_admin">
      <CoachingAdminContent />
    </CoachingAccessGuard>
  );
}
