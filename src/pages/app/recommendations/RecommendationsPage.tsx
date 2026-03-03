import * as React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useRecommendations,
  useRecommendationMutations,
  type CoachRecommendation,
  type RecommendationFilter,
  type RecommendationStatus,
  type RecommendationType,
} from "@/hooks/useRecommendations";

const STATUS_CONFIG: Record<RecommendationStatus, { label: string; icon: typeof CheckCircle2; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  proposed: { label: "Proposed", icon: Clock, color: "text-blue-600", badgeVariant: "default" },
  accepted: { label: "Accepted", icon: CheckCircle2, color: "text-green-600", badgeVariant: "secondary" },
  rejected: { label: "Declined", icon: XCircle, color: "text-red-600", badgeVariant: "destructive" },
  expired: { label: "Expired", icon: AlertTriangle, color: "text-muted-foreground", badgeVariant: "outline" },
};

const TYPE_LABELS: Record<RecommendationType, string> = {
  task: "Task",
  project: "Project",
  calendar_event: "Calendar Event",
  note_prompt: "Note Prompt",
  document_prompt: "Document Prompt",
  framework_change_suggestion: "Framework Change",
};

function RecommendationCard({
  rec,
  onAccept,
  onReject,
}: {
  rec: CoachRecommendation;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const statusConfig = STATUS_CONFIG[rec.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5`}>
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{rec.title}</h3>
              <Badge variant={statusConfig.badgeVariant} className="text-xs">
                <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {TYPE_LABELS[rec.recommendation_type] || rec.recommendation_type}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              {format(new Date(rec.created_at), "MMM d, yyyy 'at' h:mm a")}
              {rec.accepted_at && (
                <> &middot; Accepted {format(new Date(rec.accepted_at), "MMM d, yyyy")}</>
              )}
            </p>

            {rec.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{rec.description}</p>
            )}

            {rec.rejection_reason && (
              <p className="text-xs text-destructive italic mb-2">
                Decline reason: {rec.rejection_reason}
              </p>
            )}

            {rec.converted_entity_type && (
              <p className="text-xs text-green-600 mb-2">
                Converted to {rec.converted_entity_type}
              </p>
            )}

            {/* Expandable payload details */}
            {rec.payload && Object.keys(rec.payload).length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? "Hide details" : "Show details"}
              </button>
            )}

            {expanded && rec.payload && (
              <div className="mt-2 p-3 rounded-md bg-muted/50 text-xs font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(rec.payload, null, 2)}
              </div>
            )}
          </div>

          {/* Action buttons for proposed recommendations */}
          {rec.status === "proposed" && (
            <div className="flex flex-col gap-1 flex-shrink-0">
              <Button size="sm" variant="default" onClick={() => onAccept(rec.id)} className="text-xs">
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject(rec.id)} className="text-xs">
                Decline
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecommendationsPage() {
  const [filter, setFilter] = React.useState<RecommendationFilter>({ status: "all", type: "all" });
  const [rejectDialog, setRejectDialog] = React.useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rejectReason, setRejectReason] = React.useState("");

  const { data: recommendations = [], isLoading } = useRecommendations(filter);
  const { acceptRecommendation, rejectRecommendation } = useRecommendationMutations();

  const handleAccept = (id: string) => {
    acceptRecommendation.mutate(id);
  };

  const handleRejectClick = (id: string) => {
    setRejectDialog({ open: true, id });
    setRejectReason("");
  };

  const handleRejectConfirm = () => {
    if (rejectDialog.id) {
      rejectRecommendation.mutate({ id: rejectDialog.id, reason: rejectReason || undefined });
    }
    setRejectDialog({ open: false, id: null });
  };

  // Summary counts
  const proposedCount = recommendations.filter((r) => r.status === "proposed").length;
  const acceptedCount = recommendations.filter((r) => r.status === "accepted").length;
  const rejectedCount = recommendations.filter((r) => r.status === "rejected").length;

  return (
    <div className="p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Lightbulb className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Recommendations</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Review and manage coaching recommendations for your organization.
        </p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending Review", value: proposedCount, color: "text-blue-600" },
          { label: "Accepted", value: acceptedCount, color: "text-green-600" },
          { label: "Declined", value: rejectedCount, color: "text-red-600" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
        <Card className="border-border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filters:</span>
              </div>
              <Select
                value={filter.status || "all"}
                onValueChange={(v) => setFilter((f) => ({ ...f, status: v as RecommendationStatus | "all" }))}
              >
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filter.type || "all"}
                onValueChange={(v) => setFilter((f) => ({ ...f, type: v as RecommendationType | "all" }))}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="calendar_event">Calendar Event</SelectItem>
                  <SelectItem value="note_prompt">Note Prompt</SelectItem>
                  <SelectItem value="document_prompt">Document Prompt</SelectItem>
                  <SelectItem value="framework_change_suggestion">Framework Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendations list */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter.status !== "all" || filter.type !== "all"
                  ? "No recommendations match the current filters."
                  : "No recommendations yet. They will appear here when coaches share suggestions."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onAccept={handleAccept}
                onReject={handleRejectClick}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Reject confirmation dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, id: open ? rejectDialog.id : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Recommendation</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for declining this recommendation.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
