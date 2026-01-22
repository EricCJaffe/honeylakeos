import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useCoachingOrgs, 
  useCoachingManagers, 
  useCoachingCoaches,
  useCoachingOrgEngagements 
} from "@/hooks/useCoachingData";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import { useCoachingTerminology } from "@/hooks/useCoachingTerminology";
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

export default function OrgAdminDashboard() {
  const { activeCoachingOrgId } = useCoachingRole();
  const { data: coachingOrgs, isLoading: orgsLoading } = useCoachingOrgs();
  const { data: managers, isLoading: managersLoading } = useCoachingManagers(activeCoachingOrgId);
  const { data: coaches, isLoading: coachesLoading } = useCoachingCoaches(activeCoachingOrgId);
  const { data: engagements, isLoading: engagementsLoading } = useCoachingOrgEngagements(activeCoachingOrgId);
  const { getTerm, isLoading: termsLoading } = useCoachingTerminology(activeCoachingOrgId);

  const [activeTab, setActiveTab] = useState("overview");

  const isLoading = orgsLoading || termsLoading;
  const activeOrg = coachingOrgs?.[0];

  // Calculate stats
  const activeEngagements = engagements?.filter((e) => e.status === "active") || [];
  const pendingOnboarding = engagements?.filter(
    (e) => e.onboarding?.[0]?.status === "pending"
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${activeOrg?.name || "Coaching"} Dashboard`}
        description={`${getTerm("module_label")} Organization Administration`}
      />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {getTerm("manager_label")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {getTerm("coach_label")}es
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coaches?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active {getTerm("member_label")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEngagements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOnboarding.length}</div>
          </CardContent>
        </Card>
      </div>

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
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
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

            {/* Recent Activity */}
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
                        <Badge variant="outline" className="text-yellow-600">
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
                {managersLoading ? (
                  <Skeleton className="h-20" />
                ) : managers?.length === 0 ? (
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
                {coachesLoading ? (
                  <Skeleton className="h-20" />
                ) : coaches?.length === 0 ? (
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

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Configure your {getTerm("module_label")} organization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Program Type</h4>
                <p className="text-sm text-muted-foreground">
                  {activeOrg?.program_name || "Generic"} (v{activeOrg?.program_version || "1.0"})
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to="/app/coaching/org/terminology">
                    Manage Terminology
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/app/coaching/org/workflows">
                    Manage Workflows
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
