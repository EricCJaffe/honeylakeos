import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { 
  useMyCoachProfile, 
  useMyAssignedEngagements, 
  useCoachingEngagements,
  usePendingRecommendations 
} from "@/hooks/useCoaching";
import { useMembership } from "@/lib/membership";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Building2, 
  Lightbulb, 
  ArrowRight, 
  UserCheck,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function CoachingPage() {
  const { isCompanyAdmin } = useMembership();
  const { data: myProfile, isLoading: profileLoading } = useMyCoachProfile();
  const { data: myEngagements, isLoading: engagementsLoading } = useMyAssignedEngagements();
  const { data: allEngagements, isLoading: allEngagementsLoading } = useCoachingEngagements();
  const { data: pendingRecs, isLoading: recsLoading } = usePendingRecommendations();

  const [activeTab, setActiveTab] = useState("clients");

  const isCoachManagerOrAdmin = myProfile?.coach_role === "coach_manager" || myProfile?.coach_role === "org_admin";
  const isLoading = profileLoading || engagementsLoading;

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

  // If user has no coach profile, show setup prompt
  if (!myProfile && isCompanyAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Coaching"
          description="Manage your coaching business and client relationships"
        />
        <Card>
          <CardHeader>
            <CardTitle>Set Up Coaching Organization</CardTitle>
            <CardDescription>
              Configure your company as a coaching organization to start managing clients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/app/coaching/setup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show pending recommendations for client companies (non-coaches)
  if (!myProfile && pendingRecs && pendingRecs.length > 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Coach Recommendations"
          description="Review recommendations from your coaching team"
        />
        <div className="space-y-4">
          {pendingRecs.map((rec: any) => (
            <Card key={rec.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{rec.title}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mr-2">
                        {rec.recommendation_type.replace("_", " ")}
                      </Badge>
                      From {rec.engagement?.coaching_org?.name}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </CardHeader>
              {rec.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </CardContent>
              )}
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link to={`/app/coaching/recommendations/${rec.id}`}>
                      Review
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Coaching"
          description="No coaching access configured"
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            You don't have access to coaching features. Contact your administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coaching Dashboard"
        description={`Welcome, ${myProfile.coach_role.replace("_", " ")}`}
      />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myEngagements?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Engagements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myEngagements?.filter((e: any) => e.engagement?.engagement_status === "active").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingRecs?.length || 0}
            </div>
          </CardContent>
        </Card>

        {isCoachManagerOrAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Org Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allEngagements?.length || 0}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            My Clients
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
          {isCoachManagerOrAdmin && (
            <TabsTrigger value="all-clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Clients
            </TabsTrigger>
          )}
          {isCoachManagerOrAdmin && (
            <TabsTrigger value="coaches" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Team
            </TabsTrigger>
          )}
        </TabsList>

        {/* My Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          {myEngagements?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No clients assigned yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myEngagements?.map((assignment: any) => (
                <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {assignment.engagement?.client?.name}
                        </CardTitle>
                        <CardDescription>
                          {assignment.engagement?.framework?.name || "No framework"}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          assignment.engagement?.engagement_status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {assignment.engagement?.engagement_status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {assignment.assignment_role.replace("_", " ")}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/app/coaching/clients/${assignment.engagement?.id}`}>
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

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link to="/app/coaching/recommendations/new">
                <Lightbulb className="mr-2 h-4 w-4" />
                New Recommendation
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Recommendation history coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Clients Tab (Coach Managers) */}
        <TabsContent value="all-clients" className="space-y-4">
          {allEngagementsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : allEngagements?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No client engagements yet.</p>
                <Button asChild>
                  <Link to="/app/coaching/engagements/new">
                    Add Client Engagement
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allEngagements?.map((engagement: any) => (
                <Card key={engagement.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{engagement.client?.name}</CardTitle>
                        <CardDescription>
                          {engagement.framework?.name || "No framework"}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={engagement.engagement_status === "active" ? "default" : "secondary"}
                      >
                        {engagement.engagement_status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/app/coaching/clients/${engagement.id}`}>
                        Manage
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="coaches" className="space-y-4">
          <Button asChild>
            <Link to="/app/coaching/team">
              Manage Team
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
