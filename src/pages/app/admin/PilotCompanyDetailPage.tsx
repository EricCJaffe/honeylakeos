import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMembership } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useActivationScore,
  useComputeAndStoreScore,
  PilotCompanyStats,
  getScoreBand,
} from "@/hooks/usePilotValidation";
import { ActivationScoreCard } from "@/components/validation/ActivationScoreCard";
import { ActivationTimeline } from "@/components/validation/ActivationTimeline";
import { FeedbackTriagePanel } from "@/components/validation/FeedbackTriagePanel";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  ArrowLeft,
  Building2,
  BarChart3,
  MessageSquare,
  Activity,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PilotCompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { isSiteAdmin, isSuperAdmin } = useMembership();
  const hasAccess = isSiteAdmin || isSuperAdmin;

  // Fetch company and pilot info
  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ["pilot-company-detail", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, name, created_at")
        .eq("id", companyId)
        .single();

      if (companyError) throw companyError;

      const { data: pilot, error: pilotError } = await supabase
        .from("pilot_flags")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (pilotError) throw pilotError;

      const { data: stats } = await supabase.rpc("get_pilot_company_stats", {
        p_company_id: companyId,
      });

      return {
        company,
        pilot,
        stats: stats as unknown as PilotCompanyStats,
      };
    },
    enabled: !!companyId && hasAccess,
  });

  const { data: activationScore, isLoading: isLoadingScore } = useActivationScore(companyId);
  const { mutate: computeScore, isPending: isComputing } = useComputeAndStoreScore();

  if (!hasAccess) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title="Access Denied"
          description="You need Site Admin privileges to view pilot company details."
        />
      </div>
    );
  }

  if (isLoadingCompany) {
    return (
      <div className="container py-6 max-w-5xl">
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (!companyData?.company) {
    return (
      <div className="container py-6 max-w-5xl">
        <EmptyState
          icon={Building2}
          title="Company Not Found"
          description="The requested company could not be found."
        />
      </div>
    );
  }

  const { company, pilot, stats } = companyData;
  const score = stats?.activation_score ?? 0;
  const band = getScoreBand(score);

  return (
    <div className="container py-6 max-w-5xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/app/admin/validation")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <PageHeader
        title={company.name}
        description="Pilot company activation details and feedback"
      />

      <div className="flex items-center gap-2 mb-6">
        {pilot?.is_pilot && !pilot?.ended_at && (
          <Badge variant="secondary" className="gap-1">
            <Activity className="h-3 w-3" />
            Active Pilot
          </Badge>
        )}
        {pilot?.cohort_name && (
          <Badge variant="outline">{pilot.cohort_name}</Badge>
        )}
        <Badge
          variant="outline"
          className={
            band === "green"
              ? "border-green-500 text-green-600"
              : band === "yellow"
              ? "border-yellow-500 text-yellow-600"
              : "border-red-500 text-red-600"
          }
        >
          Score: {score}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users (7d)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats?.active_users_7d ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Activity</CardDescription>
            <CardTitle className="text-lg">
              {stats?.last_activity
                ? formatDistanceToNow(new Date(stats.last_activity), { addSuffix: true })
                : "No activity"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pilot Started</CardDescription>
            <CardTitle className="text-lg">
              {pilot?.started_at
                ? formatDistanceToNow(new Date(pilot.started_at), { addSuffix: true })
                : "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Feedback Items</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats?.feedback_count ?? 0}
              {(stats?.open_feedback_count ?? 0) > 0 && (
                <span className="text-amber-600 text-sm ml-2">
                  ({stats?.open_feedback_count} open)
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="score" className="space-y-6">
        <TabsList>
          <TabsTrigger value="score" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Activation Score
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        {/* Score Tab */}
        <TabsContent value="score">
          <ActivationScoreCard
            score={activationScore ?? null}
            isLoading={isLoadingScore}
            onRecalculate={() => companyId && computeScore({ companyId })}
            isRecalculating={isComputing}
            showCoachSuggestions
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          {companyId && <ActivationTimeline companyId={companyId} />}
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <FeedbackTriagePanel companyId={companyId} hideCompanyColumn />
        </TabsContent>
      </Tabs>
    </div>
  );
}
