import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Building2, 
  Users, 
  UserCheck, 
  Briefcase, 
  Clock, 
  CheckCircle2,
  PlayCircle,
  FileText,
  AlertTriangle
} from "lucide-react";
import { InspectorOrgsTab } from "@/components/coaching/inspector/InspectorOrgsTab";
import { InspectorManagersTab } from "@/components/coaching/inspector/InspectorManagersTab";
import { InspectorCoachesTab } from "@/components/coaching/inspector/InspectorCoachesTab";
import { InspectorEngagementsTab } from "@/components/coaching/inspector/InspectorEngagementsTab";
import { InspectorWorkflowAssignmentsTab } from "@/components/coaching/inspector/InspectorWorkflowAssignmentsTab";
import { InspectorWorkflowRunsTab } from "@/components/coaching/inspector/InspectorWorkflowRunsTab";
import { InspectorAssignmentsTab } from "@/components/coaching/inspector/InspectorAssignmentsTab";

interface InspectorStats {
  coachingOrgs: number;
  managers: number;
  coaches: number;
  activeEngagements: number;
  pendingEngagements: number;
  endedEngagements: number;
  activeWorkflowAssignments: number;
  recentWorkflowRuns: number;
  activeCoachingAssignments: number;
}

function useInspectorStats() {
  return useQuery({
    queryKey: ["coaching-inspector-stats"],
    queryFn: async (): Promise<InspectorStats> => {
      // Fetch all counts in parallel
      const [
        orgsResult,
        managersResult,
        coachesResult,
        engagementsResult,
        workflowAssignmentsResult,
        workflowRunsResult,
        assignmentsResult
      ] = await Promise.all([
        supabase.from("coaching_orgs").select("id", { count: "exact", head: true }),
        supabase.from("coaching_managers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("coaching_coaches").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("coaching_org_engagements").select("id, status"),
        supabase.from("coaching_workflow_assignments").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("coaching_workflow_runs").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("coaching_assignments").select("id", { count: "exact", head: true }).eq("status", "active")
      ]);

      const engagements = engagementsResult.data || [];
      const activeEngagements = engagements.filter(e => e.status === "active").length;
      const pendingEngagements = engagements.filter(e => e.status === "pending_acceptance").length;
      const endedEngagements = engagements.filter(e => e.status === "ended").length;

      return {
        coachingOrgs: orgsResult.count || 0,
        managers: managersResult.count || 0,
        coaches: coachesResult.count || 0,
        activeEngagements,
        pendingEngagements,
        endedEngagements,
        activeWorkflowAssignments: workflowAssignmentsResult.count || 0,
        recentWorkflowRuns: workflowRunsResult.count || 0,
        activeCoachingAssignments: assignmentsResult.count || 0
      };
    }
  });
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  onClick?: () => void;
}

function StatCard({ title, value, icon, onClick }: StatCardProps) {
  return (
    <Card 
      className={onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function CoachingInspectorPage() {
  const { isSiteAdmin, isSuperAdmin } = useMembership();
  const [activeTab, setActiveTab] = React.useState("overview");
  const { data: stats, isLoading } = useInspectorStats();

  // Access check
  if (!isSiteAdmin && !isSuperAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is only accessible to Site Administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coaching Inspector</h1>
          <p className="text-muted-foreground">
            Read-only view for validating the coaching system state
          </p>
        </div>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          Internal / Validation Only
        </Badge>
      </div>

      {/* Warning Banner */}
      <Alert className="bg-amber-500/10 border-amber-500/30">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-600">Internal Validation Tool</AlertTitle>
        <AlertDescription className="text-amber-600/80">
          This is a read-only inspector for system validation. No data can be modified from this interface.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orgs">Coaching Orgs</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
          <TabsTrigger value="coaches">Coaches</TabsTrigger>
          <TabsTrigger value="engagements">Engagements</TabsTrigger>
          <TabsTrigger value="workflow-assignments">Workflow Assignments</TabsTrigger>
          <TabsTrigger value="workflow-runs">Workflow Runs</TabsTrigger>
          <TabsTrigger value="assignments">Coaching Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard
              title="Coaching Orgs"
              value={stats?.coachingOrgs || 0}
              icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
              onClick={() => setActiveTab("orgs")}
            />
            <StatCard
              title="Managers"
              value={stats?.managers || 0}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              onClick={() => setActiveTab("managers")}
            />
            <StatCard
              title="Coaches"
              value={stats?.coaches || 0}
              icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
              onClick={() => setActiveTab("coaches")}
            />
            <StatCard
              title="Active Engagements"
              value={stats?.activeEngagements || 0}
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              onClick={() => setActiveTab("engagements")}
            />
            <StatCard
              title="Pending Engagements"
              value={stats?.pendingEngagements || 0}
              icon={<Clock className="h-4 w-4 text-amber-500" />}
              onClick={() => setActiveTab("engagements")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Ended Engagements"
              value={stats?.endedEngagements || 0}
              icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
              onClick={() => setActiveTab("engagements")}
            />
            <StatCard
              title="Active Workflow Assignments"
              value={stats?.activeWorkflowAssignments || 0}
              icon={<PlayCircle className="h-4 w-4 text-blue-500" />}
              onClick={() => setActiveTab("workflow-assignments")}
            />
            <StatCard
              title="Recent Workflow Runs (7d)"
              value={stats?.recentWorkflowRuns || 0}
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              onClick={() => setActiveTab("workflow-runs")}
            />
            <StatCard
              title="Active Coaching Assignments"
              value={stats?.activeCoachingAssignments || 0}
              icon={<FileText className="h-4 w-4 text-purple-500" />}
              onClick={() => setActiveTab("assignments")}
            />
          </div>
        </TabsContent>

        <TabsContent value="orgs">
          <InspectorOrgsTab />
        </TabsContent>

        <TabsContent value="managers">
          <InspectorManagersTab />
        </TabsContent>

        <TabsContent value="coaches">
          <InspectorCoachesTab />
        </TabsContent>

        <TabsContent value="engagements">
          <InspectorEngagementsTab />
        </TabsContent>

        <TabsContent value="workflow-assignments">
          <InspectorWorkflowAssignmentsTab />
        </TabsContent>

        <TabsContent value="workflow-runs">
          <InspectorWorkflowRunsTab />
        </TabsContent>

        <TabsContent value="assignments">
          <InspectorAssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
