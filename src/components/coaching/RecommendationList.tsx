import { Link } from "react-router-dom";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { useCoachRecommendations, CoachRecommendation } from "@/hooks/useCoaching";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  FileText,
  Calendar,
  FolderOpen,
  Settings,
  Timer,
} from "lucide-react";

interface RecommendationListProps {
  engagementId?: string;
  targetCompanyId?: string;
  showClientColumn?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  task: CheckCircle2,
  project: FolderOpen,
  calendar_event: Calendar,
  note_prompt: FileText,
  document_prompt: FileText,
  framework_change_suggestion: Settings,
};

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  proposed: { variant: "secondary", icon: Clock },
  accepted: { variant: "default", icon: CheckCircle2 },
  rejected: { variant: "destructive", icon: XCircle },
  expired: { variant: "outline", icon: Timer },
};

export function RecommendationList({
  engagementId,
  targetCompanyId,
  showClientColumn = false,
}: RecommendationListProps) {
  const { data: recommendations, isLoading } = useCoachRecommendations(engagementId, targetCompanyId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!recommendations?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Lightbulb className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No recommendations yet</p>
        </CardContent>
      </Card>
    );
  }

  // Group by status
  const proposed = recommendations.filter((r) => r.status === "proposed");
  const accepted = recommendations.filter((r) => r.status === "accepted");
  const rejected = recommendations.filter((r) => r.status === "rejected");
  const expired = recommendations.filter((r) => r.status === "expired");

  return (
    <Tabs defaultValue="proposed">
      <TabsList>
        <TabsTrigger value="proposed" className="flex items-center gap-2">
          Proposed
          {proposed.length > 0 && (
            <Badge variant="secondary" className="ml-1">{proposed.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="accepted" className="flex items-center gap-2">
          Accepted
          {accepted.length > 0 && (
            <Badge variant="secondary" className="ml-1">{accepted.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="rejected">
          Rejected
          {rejected.length > 0 && (
            <Badge variant="secondary" className="ml-1">{rejected.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="all">All</TabsTrigger>
      </TabsList>

      <TabsContent value="proposed" className="space-y-3 mt-4">
        {proposed.length === 0 ? (
          <EmptyState status="proposed" />
        ) : (
          proposed.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} showClient={showClientColumn} />
          ))
        )}
      </TabsContent>

      <TabsContent value="accepted" className="space-y-3 mt-4">
        {accepted.length === 0 ? (
          <EmptyState status="accepted" />
        ) : (
          accepted.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} showClient={showClientColumn} />
          ))
        )}
      </TabsContent>

      <TabsContent value="rejected" className="space-y-3 mt-4">
        {rejected.length === 0 ? (
          <EmptyState status="rejected" />
        ) : (
          rejected.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} showClient={showClientColumn} />
          ))
        )}
      </TabsContent>

      <TabsContent value="all" className="space-y-3 mt-4">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} recommendation={rec} showClient={showClientColumn} />
        ))}
      </TabsContent>
    </Tabs>
  );
}

function RecommendationCard({
  recommendation,
  showClient = false,
}: {
  recommendation: CoachRecommendation;
  showClient?: boolean;
}) {
  const TypeIcon = typeIcons[recommendation.recommendation_type] || Lightbulb;
  const statusCfg = statusConfig[recommendation.status];
  const StatusIcon = statusCfg?.icon || Clock;

  // Calculate acceptance latency for accepted recommendations
  const acceptanceLatency = recommendation.accepted_at
    ? differenceInHours(new Date(recommendation.accepted_at), new Date(recommendation.created_at))
    : null;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{recommendation.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {recommendation.recommendation_type.replace(/_/g, " ")}
                </Badge>
                <span className="text-xs">
                  {formatDistanceToNow(new Date(recommendation.created_at), { addSuffix: true })}
                </span>
              </CardDescription>
            </div>
          </div>
          <Badge variant={statusCfg?.variant || "secondary"} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {recommendation.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {recommendation.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {recommendation.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {acceptanceLatency !== null && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Accepted in {acceptanceLatency < 24 ? `${acceptanceLatency}h` : `${Math.round(acceptanceLatency / 24)}d`}
              </span>
            )}
            {recommendation.converted_entity_type && (
              <Badge variant="outline" className="text-xs">
                → {recommendation.converted_entity_type}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/app/coaching/clients/${recommendation.engagement_id}`}>
              View
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ status }: { status: string }) {
  const messages: Record<string, string> = {
    proposed: "No pending recommendations",
    accepted: "No accepted recommendations yet",
    rejected: "No rejected recommendations",
  };

  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <p>{messages[status] || "No recommendations"}</p>
      </CardContent>
    </Card>
  );
}
