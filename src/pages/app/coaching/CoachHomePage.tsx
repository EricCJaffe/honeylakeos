import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, isAfter, isBefore, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useMyCoachProfile, useMyAssignedEngagements, useCoachRecommendations } from "@/hooks/useCoaching";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Target,
  TrendingDown,
  BookOpen,
} from "lucide-react";

interface UpcomingSession {
  id: string;
  title: string;
  start_at: string;
  clientName: string;
  clientId: string;
  engagementId: string;
  cadenceLabel?: string;
  needsPrep: boolean;
}

interface ClientAlert {
  engagementId: string;
  clientName: string;
  reason: string;
  severity: "warning" | "error";
  icon: React.ElementType;
}

export default function CoachHomePage() {
  const { data: myProfile, isLoading: profileLoading } = useMyCoachProfile();
  const { data: myEngagements, isLoading: engagementsLoading } = useMyAssignedEngagements();

  // Fetch upcoming sessions across all clients
  const { data: upcomingSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["coach-upcoming-sessions", myEngagements?.map((e: any) => e.engagement?.client_company_id)],
    queryFn: async () => {
      if (!myEngagements?.length) return [];

      const clientIds = myEngagements
        .map((e: any) => e.engagement?.client_company_id)
        .filter(Boolean);

      if (clientIds.length === 0) return [];

      const now = new Date();
      const twoWeeksFromNow = addDays(now, 14);

      const { data: events, error } = await supabase
        .from("events")
        .select("id, title, start_at, company_id, category")
        .in("company_id", clientIds)
        .gte("start_at", now.toISOString())
        .lte("start_at", twoWeeksFromNow.toISOString())
        .order("start_at", { ascending: true })
        .limit(20);

      if (error) throw error;

      // Map events to sessions with client info
      return (events || []).map((event) => {
        const engagement = myEngagements.find(
          (e: any) => e.engagement?.client_company_id === event.company_id
        );
        return {
          id: event.id,
          title: event.title,
          start_at: event.start_at,
          clientName: engagement?.engagement?.client?.name || "Unknown Client",
          clientId: event.company_id,
          engagementId: engagement?.engagement?.id || "",
          cadenceLabel: event.category,
          needsPrep: false, // TODO: Could check if notes exist
        } as UpcomingSession;
      });
    },
    enabled: !!myEngagements?.length,
  });

  // Fetch client health alerts
  const { data: clientAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["coach-client-alerts", myEngagements?.map((e: any) => e.engagement?.client_company_id)],
    queryFn: async () => {
      if (!myEngagements?.length) return [];

      const alerts: ClientAlert[] = [];
      const now = new Date();

      for (const assignment of myEngagements) {
        const engagement = assignment.engagement;
        if (!engagement?.client_company_id) continue;

        const clientId = engagement.client_company_id;
        const clientName = engagement.client?.name || "Unknown";
        const engagementId = engagement.id;

        // Check for overdue tasks (due in past, not completed)
        const { data: overdueTasks } = await supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("company_id", clientId)
          .lt("due_date", now.toISOString())
          .neq("status", "completed")
          .is("archived_at", null)
          .limit(1);

        if (overdueTasks && overdueTasks.length > 0) {
          alerts.push({
            engagementId,
            clientName,
            reason: "Has overdue tasks",
            severity: "warning",
            icon: Clock,
          });
        }

        // Check for stalled projects (no updates in 14 days)
        const twoWeeksAgo = addDays(now, -14);
        const { data: stalledProjects } = await supabase
          .from("projects")
          .select("id", { count: "exact" })
          .eq("company_id", clientId)
          .eq("status", "active")
          .lt("updated_at", twoWeeksAgo.toISOString())
          .is("archived_at", null)
          .limit(1);

        if (stalledProjects && stalledProjects.length > 0) {
          alerts.push({
            engagementId,
            clientName,
            reason: "Stalled projects (no updates in 14 days)",
            severity: "warning",
            icon: TrendingDown,
          });
        }
      }

      return alerts;
    },
    enabled: !!myEngagements?.length,
  });

  const isLoading = profileLoading || engagementsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Coach Home" description="No coach profile found" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            You need a coach profile to access this view.
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${getTimeOfDay()}`}
        description={today}
      />

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Clients
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
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Sessions This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingSessions?.filter((s) => {
                const sessionDate = parseISO(s.start_at);
                const weekFromNow = addDays(new Date(), 7);
                return isBefore(sessionDate, weekFromNow);
              }).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Clients Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {clientAlerts?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Pending Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Client Sessions
            </CardTitle>
            <CardDescription>Next 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !upcomingSessions?.length ? (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming sessions</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{session.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {session.clientName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(session.start_at), "EEE, MMM d 'at' h:mm a")}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {session.cadenceLabel && (
                          <Badge variant="outline" className="text-xs">
                            {session.cadenceLabel}
                          </Badge>
                        )}
                        {session.needsPrep && (
                          <Badge variant="secondary" className="text-xs">
                            Needs Prep
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/app/coaching/clients/${session.engagementId}`}>
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Clients Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Clients Needing Attention
            </CardTitle>
            <CardDescription>Issues requiring follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !clientAlerts?.length ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>All clients on track!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientAlerts.map((alert, idx) => {
                  const Icon = alert.icon;
                  return (
                    <div
                      key={`${alert.engagementId}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          alert.severity === "error" 
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30" 
                            : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{alert.clientName}</div>
                          <div className="text-sm text-muted-foreground">{alert.reason}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/app/coaching/clients/${alert.engagementId}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/app/coaching/recommendations/new">
                <Target className="mr-2 h-4 w-4" />
                New Recommendation
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/app/coaching">
                <Users className="mr-2 h-4 w-4" />
                View All Clients
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/app/coaching/playbooks">
                <BookOpen className="mr-2 h-4 w-4" />
                Framework Playbooks
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
