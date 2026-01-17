import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useCoachRecommendations, useRecommendationMutations } from "@/hooks/useCoaching";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Lightbulb, 
  Calendar, 
  CheckCircle2, 
  FileText,
  ArrowLeft,
  Plus
} from "lucide-react";
import { useState } from "react";

export default function ClientDetailPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch engagement details
  const { data: engagement, isLoading: engagementLoading } = useQuery({
    queryKey: ["coaching-engagement", engagementId],
    queryFn: async () => {
      if (!engagementId) return null;
      const { data, error } = await supabase
        .from("coaching_engagements")
        .select(`
          *,
          client:companies!coaching_engagements_client_company_id_fkey(id, name),
          coaching_org:companies!coaching_engagements_coaching_org_company_id_fkey(id, name),
          framework:frameworks(id, name, status)
        `)
        .eq("id", engagementId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!engagementId,
  });

  // Fetch recommendations for this engagement
  const { data: recommendations, isLoading: recsLoading } = useCoachRecommendations(engagementId);

  // Fetch client data summary (tasks, projects, events)
  const { data: clientSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["client-summary", engagement?.client_company_id],
    queryFn: async () => {
      if (!engagement?.client_company_id) return null;
      const clientId = engagement.client_company_id;

      const [tasks, projects, events] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, status, due_date", { count: "exact" })
          .eq("company_id", clientId)
          .is("archived_at", null)
          .order("due_date", { ascending: true })
          .limit(10),
        supabase
          .from("projects")
          .select("id, name, status", { count: "exact" })
          .eq("company_id", clientId)
          .is("archived_at", null)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("events")
          .select("id, title, start_at", { count: "exact" })
          .eq("company_id", clientId)
          .gte("start_at", new Date().toISOString())
          .order("start_at", { ascending: true })
          .limit(10),
      ]);

      return {
        tasks: tasks.data || [],
        tasksCount: tasks.count || 0,
        projects: projects.data || [],
        projectsCount: projects.count || 0,
        events: events.data || [],
        eventsCount: events.count || 0,
      };
    },
    enabled: !!engagement?.client_company_id,
  });

  if (engagementLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="space-y-6">
        <PageHeader title="Client Not Found" description="The engagement could not be found." />
        <Button variant="outline" asChild>
          <Link to="/app/coaching">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Coaching
          </Link>
        </Button>
      </div>
    );
  }

  const pendingRecs = recommendations?.filter((r) => r.status === "proposed") || [];
  const acceptedRecs = recommendations?.filter((r) => r.status === "accepted") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/coaching">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={engagement.client?.name || "Client"}
          description={`Engagement with ${engagement.coaching_org?.name}`}
        />
      </div>

      {/* Engagement Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {engagement.client?.name}
              </CardTitle>
              <CardDescription className="mt-1">
                {engagement.framework?.name && (
                  <Badge variant="outline" className="mr-2">
                    {engagement.framework.name}
                  </Badge>
                )}
                Started {engagement.start_date ? new Date(engagement.start_date).toLocaleDateString() : "N/A"}
              </CardDescription>
            </div>
            <Badge
              variant={engagement.engagement_status === "active" ? "default" : "secondary"}
            >
              {engagement.engagement_status}
            </Badge>
          </div>
        </CardHeader>
        {engagement.notes && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{engagement.notes}</p>
          </CardContent>
        )}
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
            {pendingRecs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingRecs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Tasks Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="text-2xl font-bold mb-2">{clientSummary?.tasksCount || 0}</div>
                    <ul className="space-y-1">
                      {clientSummary?.tasks.slice(0, 5).map((task: any) => (
                        <li key={task.id} className="text-sm text-muted-foreground truncate">
                          {task.title}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Projects Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="text-2xl font-bold mb-2">{clientSummary?.projectsCount || 0}</div>
                    <ul className="space-y-1">
                      {clientSummary?.projects.slice(0, 5).map((project: any) => (
                        <li key={project.id} className="text-sm text-muted-foreground truncate">
                          {project.name}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="text-2xl font-bold mb-2">{clientSummary?.eventsCount || 0}</div>
                    <ul className="space-y-1">
                      {clientSummary?.events.slice(0, 5).map((event: any) => (
                        <li key={event.id} className="text-sm text-muted-foreground truncate">
                          {event.title}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link to={`/app/coaching/recommendations/new?engagement=${engagementId}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Recommendation
              </Link>
            </Button>
          </div>

          {recsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : recommendations?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No recommendations yet. Create one to help guide your client.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recommendations?.map((rec) => (
                <Card key={rec.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{rec.title}</CardTitle>
                        <CardDescription>
                          <Badge variant="outline" className="mr-2">
                            {rec.recommendation_type.replace("_", " ")}
                          </Badge>
                          {new Date(rec.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          rec.status === "proposed"
                            ? "secondary"
                            : rec.status === "accepted"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {rec.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  {rec.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Activity timeline coming soon.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
