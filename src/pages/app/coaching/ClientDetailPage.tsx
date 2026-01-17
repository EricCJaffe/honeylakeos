import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, addDays, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useCoachRecommendations, useRecommendationMutations } from "@/hooks/useCoaching";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { RecommendationList } from "@/components/coaching/RecommendationList";
import { RecommendationComposer } from "@/components/coaching/RecommendationComposer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Lightbulb, 
  Calendar, 
  CheckCircle2, 
  FileText,
  ArrowLeft,
  Plus,
  Target,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  StickyNote,
} from "lucide-react";

export default function ClientDetailPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewRecommendation, setShowNewRecommendation] = useState(false);

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
  const { data: recommendations } = useCoachRecommendations(engagementId);

  // Fetch client data summary with more detail
  const { data: clientSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["client-summary-detailed", engagement?.client_company_id],
    queryFn: async () => {
      if (!engagement?.client_company_id) return null;
      const clientId = engagement.client_company_id;
      const now = new Date();
      const weekFromNow = addDays(now, 7);

      const [tasks, projects, events, notes, overdueTasks] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, status, due_date, priority", { count: "exact" })
          .eq("company_id", clientId)
          .is("archived_at", null)
          .order("due_date", { ascending: true })
          .limit(10),
        supabase
          .from("projects")
          .select("id, name, status, updated_at", { count: "exact" })
          .eq("company_id", clientId)
          .is("archived_at", null)
          .order("updated_at", { ascending: false })
          .limit(10),
        supabase
          .from("events")
          .select("id, title, start_at, category", { count: "exact" })
          .eq("company_id", clientId)
          .gte("start_at", now.toISOString())
          .lte("start_at", weekFromNow.toISOString())
          .order("start_at", { ascending: true })
          .limit(10),
        supabase
          .from("notes")
          .select("id, title, updated_at", { count: "exact" })
          .eq("company_id", clientId)
          .is("archived_at", null)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("company_id", clientId)
          .lt("due_date", now.toISOString())
          .neq("status", "completed")
          .is("archived_at", null),
      ]);

      // Calculate health indicators
      const overdueCount = overdueTasks.count || 0;
      const activeProjects = projects.data?.filter((p: any) => p.status === "active").length || 0;
      const completedTasks = tasks.data?.filter((t: any) => t.status === "completed").length || 0;
      const totalTasks = tasks.count || 0;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        tasks: tasks.data || [],
        tasksCount: tasks.count || 0,
        projects: projects.data || [],
        projectsCount: projects.count || 0,
        activeProjectsCount: activeProjects,
        events: events.data || [],
        eventsCount: events.count || 0,
        notes: notes.data || [],
        notesCount: notes.count || 0,
        overdueCount,
        completionRate,
        healthScore: overdueCount > 5 ? "poor" : overdueCount > 0 ? "fair" : "good",
      };
    },
    enabled: !!engagement?.client_company_id,
  });

  // Fetch last session (most recent past event)
  const { data: lastSession } = useQuery({
    queryKey: ["client-last-session", engagement?.client_company_id],
    queryFn: async () => {
      if (!engagement?.client_company_id) return null;
      const { data } = await supabase
        .from("events")
        .select("id, title, start_at")
        .eq("company_id", engagement.client_company_id)
        .lt("start_at", new Date().toISOString())
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!engagement?.client_company_id,
  });

  // Fetch next session
  const { data: nextSession } = useQuery({
    queryKey: ["client-next-session", engagement?.client_company_id],
    queryFn: async () => {
      if (!engagement?.client_company_id) return null;
      const { data } = await supabase
        .from("events")
        .select("id, title, start_at")
        .eq("company_id", engagement.client_company_id)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
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
  const healthColor = clientSummary?.healthScore === "good" 
    ? "text-green-600" 
    : clientSummary?.healthScore === "fair" 
    ? "text-yellow-600" 
    : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/coaching">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <PageHeader
            title={engagement.client?.name || "Client"}
            description={`Engagement with ${engagement.coaching_org?.name}`}
          />
        </div>
      </div>

      {/* Enhanced Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {engagement.client?.name}
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                {engagement.framework?.name && (
                  <Badge variant="outline">
                    <Target className="mr-1 h-3 w-3" />
                    {engagement.framework.name}
                  </Badge>
                )}
                <Badge
                  variant={engagement.engagement_status === "active" ? "default" : "secondary"}
                >
                  {engagement.engagement_status}
                </Badge>
              </div>
            </div>
            
            {/* Health Indicator */}
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Health</div>
              <div className={`text-2xl font-bold ${healthColor}`}>
                {clientSummary?.healthScore === "good" && <TrendingUp className="inline h-6 w-6" />}
                {clientSummary?.healthScore === "fair" && <Minus className="inline h-6 w-6" />}
                {clientSummary?.healthScore === "poor" && <TrendingDown className="inline h-6 w-6" />}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Last Session</div>
              <div className="font-medium">
                {lastSession 
                  ? formatDistanceToNow(new Date(lastSession.start_at), { addSuffix: true })
                  : "—"
                }
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Next Session</div>
              <div className="font-medium">
                {nextSession
                  ? format(new Date(nextSession.start_at), "MMM d, h:mm a")
                  : "—"
                }
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Overdue Items</div>
              <div className={`font-medium ${(clientSummary?.overdueCount || 0) > 0 ? "text-red-600" : ""}`}>
                {clientSummary?.overdueCount || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active Priorities</div>
              <div className="font-medium">{clientSummary?.activeProjectsCount || 0}</div>
            </div>
          </div>
        </CardContent>
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
          <TabsTrigger value="notes">
            <StickyNote className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="playbooks">
            <BookOpen className="h-4 w-4 mr-2" />
            Playbooks
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Quarterly Priorities */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Active Priorities (Rocks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold mb-3">{clientSummary?.activeProjectsCount || 0}</div>
                    <ScrollArea className="h-32">
                      <ul className="space-y-2">
                        {clientSummary?.projects
                          .filter((p: any) => p.status === "active")
                          .slice(0, 5)
                          .map((project: any) => (
                            <li key={project.id} className="text-sm flex items-center justify-between">
                              <span className="truncate flex-1">{project.name}</span>
                              <Badge variant="outline" className="text-xs ml-2">
                                {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                              </Badge>
                            </li>
                          ))}
                      </ul>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Open Issues / Overdue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  At Risk / Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-24" />
                ) : (
                  <>
                    <div className={`text-2xl font-bold mb-3 ${(clientSummary?.overdueCount || 0) > 0 ? "text-red-600" : ""}`}>
                      {clientSummary?.overdueCount || 0}
                    </div>
                    <ScrollArea className="h-32">
                      <ul className="space-y-2">
                        {clientSummary?.tasks
                          .filter((t: any) => t.status !== "completed" && t.due_date && isBefore(new Date(t.due_date), new Date()))
                          .slice(0, 5)
                          .map((task: any) => (
                            <li key={task.id} className="text-sm flex items-center justify-between">
                              <span className="truncate flex-1">{task.title}</span>
                              <Badge variant="destructive" className="text-xs ml-2">
                                <Clock className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            </li>
                          ))}
                        {(clientSummary?.overdueCount || 0) === 0 && (
                          <li className="text-sm text-muted-foreground">No overdue items</li>
                        )}
                      </ul>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold mb-3">{clientSummary?.events?.length || 0}</div>
                    <ScrollArea className="h-32">
                      <ul className="space-y-2">
                        {clientSummary?.events.slice(0, 5).map((event: any) => (
                          <li key={event.id} className="text-sm">
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(event.start_at), "EEE, MMM d 'at' h:mm a")}
                            </div>
                          </li>
                        ))}
                        {(!clientSummary?.events || clientSummary.events.length === 0) && (
                          <li className="text-sm text-muted-foreground">No upcoming events</li>
                        )}
                      </ul>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Notes & Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Notes & Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-20" />
              ) : clientSummary?.notes?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent notes</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {clientSummary?.notes.map((note: any) => (
                    <div key={note.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="font-medium text-sm truncate">{note.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowNewRecommendation(!showNewRecommendation)}>
              <Plus className="mr-2 h-4 w-4" />
              {showNewRecommendation ? "Cancel" : "New Recommendation"}
            </Button>
          </div>

          {showNewRecommendation && (
            <RecommendationComposer
              preselectedEngagementId={engagementId}
              onSuccess={() => setShowNewRecommendation(false)}
              onCancel={() => setShowNewRecommendation(false)}
            />
          )}

          <RecommendationList engagementId={engagementId} />
        </TabsContent>

        {/* Notes Tab (Coach Private Notes) */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Coach Notes
              </CardTitle>
              <CardDescription>
                Private notes visible only to your coaching organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Coach notes coming soon</p>
                <p className="text-sm">Keep private notes about this client engagement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playbooks Tab */}
        <TabsContent value="playbooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Relevant Playbooks
              </CardTitle>
              <CardDescription>
                Coaching resources for {engagement.framework?.name || "this framework"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Button variant="outline" asChild>
                  <Link to="/app/coaching/playbooks">
                    <BookOpen className="mr-2 h-4 w-4" />
                    View All Playbooks
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
