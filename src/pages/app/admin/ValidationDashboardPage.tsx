import * as React from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMembership } from "@/lib/membership";
import {
  usePilotCompanies,
  usePilotFlagMutations,
  useRecalculateAllPilotScores,
  getScoreBand,
} from "@/hooks/usePilotValidation";
import { PilotCompanyCard } from "@/components/validation/PilotCompanyCard";
import { FeedbackTriagePanel } from "@/components/validation/FeedbackTriagePanel";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  Shield,
  Users,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Plus,
  Beaker,
  Target,
  TrendingUp,
} from "lucide-react";

export default function ValidationDashboardPage() {
  const navigate = useNavigate();
  const { isSiteAdmin, isSuperAdmin } = useMembership();

  const { data: pilots, isLoading } = usePilotCompanies();
  const { disablePilot } = usePilotFlagMutations();
  const { mutate: recalculateAll, isPending: isRecalculating } = useRecalculateAllPilotScores();

  const [sortBy, setSortBy] = React.useState<"score" | "recent" | "feedback">("score");

  const hasAccess = isSiteAdmin || isSuperAdmin;

  // Sort pilots
  const sortedPilots = React.useMemo(() => {
    if (!pilots) return [];
    
    return [...pilots].sort((a, b) => {
      switch (sortBy) {
        case "score":
          return (a.stats?.activation_score ?? 0) - (b.stats?.activation_score ?? 0);
        case "recent":
          return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
        case "feedback":
          return (b.stats?.open_feedback_count ?? 0) - (a.stats?.open_feedback_count ?? 0);
        default:
          return 0;
      }
    });
  }, [pilots, sortBy]);

  // Calculate aggregate stats
  const aggregateStats = React.useMemo(() => {
    if (!pilots?.length) return null;

    const scores = pilots.map((p) => p.stats?.activation_score ?? 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const atRisk = pilots.filter((p) => getScoreBand(p.stats?.activation_score ?? 0) === "red").length;
    const healthy = pilots.filter((p) => getScoreBand(p.stats?.activation_score ?? 0) === "green").length;
    const totalFeedback = pilots.reduce((sum, p) => sum + (p.stats?.feedback_count ?? 0), 0);
    const openFeedback = pilots.reduce((sum, p) => sum + (p.stats?.open_feedback_count ?? 0), 0);

    return { avgScore, atRisk, healthy, totalFeedback, openFeedback };
  }, [pilots]);

  const handleViewDetails = (companyId: string) => {
    navigate(`/app/admin/validation/${companyId}`);
  };

  const handleEndPilot = (companyId: string) => {
    if (confirm("Are you sure you want to end this pilot? This action cannot be undone.")) {
      disablePilot.mutate(companyId);
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need Site Admin privileges to access the Validation Dashboard."
        />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl">
      <PageHeader
        title="Validation Dashboard"
        description="Monitor pilot companies, activation metrics, and user feedback."
      />

      <div className="flex items-center gap-2 mb-6">
        <Badge variant="secondary" className="gap-1">
          <Beaker className="h-3 w-3" />
          Pilot Program
        </Badge>
        <Badge variant="outline">{pilots?.length ?? 0} Active Pilots</Badge>
      </div>

      {/* Aggregate Stats */}
      {aggregateStats && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Score</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{aggregateStats.avgScore}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>Target: 70+</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Healthy Pilots</CardDescription>
              <CardTitle className="text-3xl text-green-600 tabular-nums">{aggregateStats.healthy}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Score ≥70</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>At Risk</CardDescription>
              <CardTitle className="text-3xl text-red-600 tabular-nums">{aggregateStats.atRisk}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                <span>Score &lt;40</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open Feedback</CardDescription>
              <CardTitle className="text-3xl text-amber-600 tabular-nums">{aggregateStats.openFeedback}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>{aggregateStats.totalFeedback} total</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pilots" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pilots" className="gap-2">
              <Users className="h-4 w-4" />
              Pilots
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => recalculateAll()}
              disabled={isRecalculating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? "animate-spin" : ""}`} />
              Recalculate All
            </Button>
          </div>
        </div>

        {/* Pilots Tab */}
        <TabsContent value="pilots" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Lowest Score</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="feedback">Most Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <ListSkeleton count={4} />
          ) : !sortedPilots.length ? (
            <EmptyState
              icon={Beaker}
              title="No Active Pilots"
              description="Enable pilot mode for companies from the Company Console."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedPilots.map((pilot) => (
                <PilotCompanyCard
                  key={pilot.id}
                  pilot={pilot}
                  onViewDetails={handleViewDetails}
                  onEndPilot={handleEndPilot}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <FeedbackTriagePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
