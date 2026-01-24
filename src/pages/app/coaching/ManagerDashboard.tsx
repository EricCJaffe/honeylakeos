import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useCoachingCoaches, 
  useCoachingOrgEngagements 
} from "@/hooks/useCoachingData";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import { useCoachingTerminology } from "@/hooks/useCoachingTerminology";
import { 
  Users, 
  Building2, 
  UserCheck, 
  ArrowRight,
  AlertCircle
} from "lucide-react";

export default function ManagerDashboard() {
  const { activeCoachingOrgId } = useCoachingRole();
  const { getTerm, isLoading: termsLoading } = useCoachingTerminology(activeCoachingOrgId);
  
  // TODO: Get the manager's ID to filter coaches
  const { data: coaches, isLoading: coachesLoading } = useCoachingCoaches(activeCoachingOrgId);
  const { data: engagements, isLoading: engagementsLoading } = useCoachingOrgEngagements(activeCoachingOrgId);

  const [activeTab, setActiveTab] = useState("overview");

  const isLoading = termsLoading;

  // Filter engagements to only those managed by this manager's coaches
  // For now, show all engagements (TODO: filter by manager's coach assignments)
  const myEngagements = engagements || [];
  const pendingOnboarding = myEngagements.filter(
    (e) => e.onboarding?.[0]?.status === "pending"
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${getTerm("manager_label")} Dashboard`}
        description="Manage your team and their client engagements"
      />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My {getTerm("coach_label")}es
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coaches?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {getTerm("member_label")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myEngagements.length}</div>
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

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="coaches" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            My {getTerm("coach_label")}es
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {getTerm("member_label")}s
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Coaches Overview */}
            <Card>
              <CardHeader>
                <CardTitle>My {getTerm("coach_label")}es</CardTitle>
                <CardDescription>Team members you manage</CardDescription>
              </CardHeader>
              <CardContent>
                {coachesLoading ? (
                  <Skeleton className="h-20" />
                ) : coaches?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No {getTerm("coach_label")}es assigned to you
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {coaches?.slice(0, 5).map((coach: any) => (
                      <li key={coach.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            {coach.profile?.full_name?.[0] || "C"}
                          </div>
                          <span className="text-sm font-medium">
                            {coach.profile?.full_name || coach.profile?.email}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/app/coaching/coaches/${coach.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Pending Items */}
            <Card>
              <CardHeader>
                <CardTitle>Attention Needed</CardTitle>
                <CardDescription>Items requiring your review</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingOnboarding.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending items
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {pendingOnboarding.slice(0, 5).map((e) => (
                      <li key={e.id} className="flex items-center justify-between">
                        <span className="text-sm">
                          {e.member_company?.name}
                        </span>
                        <Badge variant="outline" className="text-yellow-600">
                          Onboarding Pending
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Coaches Tab */}
        <TabsContent value="coaches" className="space-y-4">
          {coachesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : coaches?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No {getTerm("coach_label")}es assigned to you yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coaches?.map((coach: any) => (
                <Card key={coach.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {coach.profile?.full_name?.[0] || "C"}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {coach.profile?.full_name || "Unknown"}
                        </CardTitle>
                        <CardDescription>
                          {coach.profile?.email}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" asChild className="w-full">
                      <Link to={`/app/coaching/coaches/${coach.id}`}>
                        View Details
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {engagementsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : myEngagements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No {getTerm("member_label")}s in your team's portfolio.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myEngagements.map((engagement) => (
                <Card key={engagement.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">
                        {engagement.member_company?.name}
                      </CardTitle>
                      <Badge
                        variant={engagement.status === "active" ? "default" : "secondary"}
                      >
                        {engagement.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" asChild className="w-full">
                      <Link to={`/app/coaching/engagements/${engagement.id}`}>
                        View Details
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
