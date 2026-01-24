import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CoachingAccessGuard } from "@/components/coaching/CoachingAccessGuard";
import { CoachingDashboardLayout } from "@/components/coaching/CoachingDashboardLayout";
import { DashboardWidgetGrid } from "@/components/coaching/DashboardWidgetGrid";
import { 
  useCoachingManagers, 
  useCoachingCoaches,
  useCoachingOrgEngagements 
} from "@/hooks/useCoachingData";
import { useActiveCoachingOrg } from "@/hooks/useActiveCoachingOrg";
import { useCoachingTerminology } from "@/hooks/useCoachingTerminology";
import { useCoachingDashboard, DashboardWidget } from "@/hooks/useCoachingDashboard";
import { 
  Users, 
  Building2, 
  UserCheck, 
  Settings,
  Plus,
  ArrowRight,
  AlertCircle,
  Clock
} from "lucide-react";

function OrgAdminDashboardContent() {
  const { activeCoachingOrgId, isLoading: orgLoading } = useActiveCoachingOrg();
  const { data: managers } = useCoachingManagers(activeCoachingOrgId);
  const { data: coaches } = useCoachingCoaches(activeCoachingOrgId);
  const { data: engagements, isLoading: engagementsLoading } = useCoachingOrgEngagements(activeCoachingOrgId);
  const { getTerm, isLoading: termsLoading } = useCoachingTerminology(activeCoachingOrgId);
  const { data: dashboard, isLoading: dashboardLoading } = useCoachingDashboard("org_admin");

  const [activeTab, setActiveTab] = useState("overview");

  const isLoading = orgLoading || termsLoading || dashboardLoading;

  // Calculate stats for widget rendering
  const activeEngagements = engagements?.filter((e) => e.status === "active") || [];
  const pendingOnboarding = engagements?.filter(
    (e) => e.onboarding?.[0]?.status === "pending"
  ) || [];

  // Custom renderer for widgets with live data
  const renderWidget = (widget: DashboardWidget): React.ReactNode | null => {
    switch (widget.widgetKey) {
      case "active_engagements":
        return (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{activeEngagements.length}</span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/coaching/engagements">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        );
      case "coach_performance":
        return (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{coaches?.length || 0}</span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/coaching/org/team">
                View Team
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        );
      case "org_health_trends":
        return (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-muted-foreground">—</span>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        );
      case "workflow_templates":
        return (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-muted-foreground">—</span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/coaching/org/workflows">
                Manage
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <CoachingDashboardLayout
      title="Org Admin Dashboard"
      description={`${getTerm("module_label")} Organization Administration`}
      isLoading={isLoading}
      headerActions={
        <Button asChild>
          <Link to="/app/coaching/org/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      }
    >
      {/* Dashboard Widgets from DB */}
      <DashboardWidgetGrid 
        widgets={dashboard?.widgets || []} 
        isLoading={dashboardLoading}
        renderWidget={renderWidget}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {getTerm("member_label")}s
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pending Onboarding */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pending Onboarding</CardTitle>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardDescription>
                  {getTerm("member_label")}s awaiting access configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingOnboarding.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending onboarding</p>
                ) : (
                  <ul className="space-y-2">
                    {pendingOnboarding.slice(0, 5).map((e) => (
                      <li key={e.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {e.member_company?.name}
                        </span>
                        <Badge variant="outline">Pending</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link to="/app/coaching/org/add-company">
                    <Plus className="mr-2 h-4 w-4" />
                    Add {getTerm("member_label")}
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link to="/app/coaching/org/team">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Manage Team
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link to="/app/coaching/org/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Organization Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link to="/app/coaching/org/add-company">
                <Plus className="mr-2 h-4 w-4" />
                Add {getTerm("member_label")}
              </Link>
            </Button>
          </div>

          {engagementsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : engagements?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No {getTerm("member_label")}s yet.</p>
                <Button asChild>
                  <Link to="/app/coaching/org/add-company">
                    Add Your First {getTerm("member_label")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {engagements?.map((engagement) => (
                <Card key={engagement.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {engagement.member_company?.name}
                        </CardTitle>
                        <CardDescription>
                          {engagement.program_key_snapshot || "Standard"}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={engagement.status === "active" ? "default" : "secondary"}
                      >
                        {engagement.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {engagement.onboarding?.[0]?.status === "pending" && (
                        <Badge variant="outline" className="text-warning">
                          Onboarding Pending
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" asChild className="ml-auto">
                        <Link to={`/app/coaching/engagements/${engagement.id}`}>
                          View
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Managers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{getTerm("manager_label")}s</CardTitle>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {managers?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No managers yet</p>
                ) : (
                  <ul className="space-y-3">
                    {managers?.map((manager: any) => (
                      <li key={manager.id} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          {manager.profile?.full_name?.[0] || "M"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {manager.profile?.full_name || manager.profile?.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {manager.profile?.email}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Coaches */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{getTerm("coach_label")}es</CardTitle>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {coaches?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No coaches yet</p>
                ) : (
                  <ul className="space-y-3">
                    {coaches?.map((coach: any) => (
                      <li key={coach.id} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          {coach.profile?.full_name?.[0] || "C"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {coach.profile?.full_name || coach.profile?.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {coach.profile?.email}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </CoachingDashboardLayout>
  );
}

export default function OrgAdminDashboard() {
  return (
    <CoachingAccessGuard requiredAccess="org_admin">
      <OrgAdminDashboardContent />
    </CoachingAccessGuard>
  );
}
