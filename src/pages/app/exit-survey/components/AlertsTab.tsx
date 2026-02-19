import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useExitSurveyAlerts,
  useExitSurveyMutations,
  useExitSurveyAlertComments,
  type ExitSurveyAlert,
} from "@/hooks/useExitSurvey";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, CheckCheck, MessageSquare, Send } from "lucide-react";

// Three user-facing states. DB enum has 5; we map acknowledged/reviewed/action_taken → acknowledged.
type VisibleStatus = "pending" | "acknowledged" | "resolved";

const VISIBLE_STATUSES: { value: VisibleStatus; label: string; color: string }[] = [
  { value: "pending",      label: "Pending",      color: "border-red-300 text-red-700 bg-red-50 hover:bg-red-100" },
  { value: "acknowledged", label: "Acknowledged",  color: "border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100" },
  { value: "resolved",     label: "Completed",     color: "border-green-300 text-green-700 bg-green-50 hover:bg-green-100" },
];

const STATUS_CONFIG: Record<
  VisibleStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  acknowledged: {
    label: "Acknowledged",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  resolved: {
    label: "Completed",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCheck className="w-3.5 h-3.5" />,
  },
};

function toVisible(status: ExitSurveyAlert["status"]): VisibleStatus {
  if (status === "resolved") return "resolved";
  if (status === "acknowledged" || status === "reviewed" || status === "action_taken") return "acknowledged";
  return "pending";
}

const PRIORITY_CONFIG: Record<ExitSurveyAlert["priority"], string> = {
  high: "bg-red-500 text-white",
  normal: "bg-orange-400 text-white",
  low: "bg-yellow-400 text-yellow-900",
};

type AlertWithRelations = ExitSurveyAlert & {
  exit_survey_questions?: {
    text: string;
    category: string;
    department: string | null;
    owner_name: string | null;
  } | null;
  exit_survey_submissions?: {
    patient_first_name: string | null;
    patient_last_name: string | null;
    submitted_at: string;
  } | null;
};

function AlertCommentThread({ alertId, isCompleted }: { alertId: string; isCompleted: boolean }) {
  const { data: comments, isLoading } = useExitSurveyAlertComments(alertId);
  const { addAlertComment } = useExitSurveyMutations();
  const [draft, setDraft] = useState("");

  function handleSubmit() {
    const text = draft.trim();
    if (!text) return;
    addAlertComment.mutate({ alertId, comment: text });
    setDraft("");
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (comments || []).length > 0 ? (
        <div className="space-y-2">
          {(comments || []).map((c) => (
            <div key={c.id} className="bg-white border rounded-md px-3 py-2">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-medium text-foreground">
                  {c.author_name || "Team member"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(c.created_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No comments yet.</p>
      )}

      {!isCompleted && (
        <div className="flex gap-2 items-start">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="resize-none text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSubmit}
            disabled={!draft.trim() || addAlertComment.isPending}
            className="shrink-0 mt-0.5"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function AlertsTab() {
  const { data: alerts, isLoading } = useExitSurveyAlerts();
  const { updateAlertStatus } = useExitSurveyMutations();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const alertList = (alerts || []) as AlertWithRelations[];

  // KPI counts across all alerts (including completed)
  const pendingCount     = alertList.filter((a) => toVisible(a.status) === "pending").length;
  const acknowledgedCount = alertList.filter((a) => toVisible(a.status) === "acknowledged").length;
  const completedCount   = alertList.filter((a) => toVisible(a.status) === "resolved").length;

  // Active list — hide completed
  const activeAlerts = [...alertList]
    .filter((a) => toVisible(a.status) !== "resolved")
    .sort((a, b) => {
      const vA = toVisible(a.status) === "pending" ? 0 : 1;
      const vB = toVisible(b.status) === "pending" ? 0 : 1;
      if (vA !== vB) return vA - vB;
      return a.score - b.score;
    });

  function handleSetStatus(alertId: string, next: VisibleStatus) {
    updateAlertStatus.mutate({ alertId, status: next === "resolved" ? "resolved" : next });
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "pending" as VisibleStatus,      count: pendingCount },
          { key: "acknowledged" as VisibleStatus,  count: acknowledgedCount },
          { key: "resolved" as VisibleStatus,      count: completedCount },
        ].map(({ key, count }) => {
          const cfg = STATUS_CONFIG[key];
          return (
            <Card key={key}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`p-1 rounded border ${cfg.color}`}>{cfg.icon}</span>
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert list — only active (non-completed) */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))
        ) : activeAlerts.length === 0 ? (
          <div className="border rounded-lg p-10 text-center text-muted-foreground text-sm">
            No open alerts. All scores are above threshold.
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const visible = toVisible(alert.status);
            const statusCfg = STATUS_CONFIG[visible];
            const isExpanded = expandedAlert === alert.id;
            const submission = alert.exit_survey_submissions;
            const question = alert.exit_survey_questions;
            const patientName =
              submission?.patient_first_name || submission?.patient_last_name
                ? `${submission.patient_first_name ?? ""} ${submission.patient_last_name ?? ""}`.trim()
                : "Anonymous";

            return (
              <div key={alert.id} className="border rounded-lg overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/10"
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                >
                  <span
                    className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_CONFIG[alert.priority]}`}
                    title={`Priority: ${alert.priority}`}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {question?.text ?? "Unknown question"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {question?.category && (
                        <Badge variant="outline" className="text-xs">
                          {question.category}
                        </Badge>
                      )}
                      {question?.department && (
                        <span className="text-xs text-muted-foreground">{question.department}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Score: <strong className="text-red-600">{alert.score}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground">{patientName}</span>
                      {submission?.submitted_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                    <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t bg-muted/5 p-4 space-y-4">
                    {/* Status selector */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Status
                      </p>
                      <div className="flex gap-2">
                        {VISIBLE_STATUSES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => handleSetStatus(alert.id, s.value)}
                            disabled={updateAlertStatus.isPending}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                              visible === s.value
                                ? s.color + " ring-2 ring-offset-1 ring-current"
                                : "border-border text-muted-foreground bg-background hover:bg-muted"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comments thread */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Comments
                      </p>
                      <AlertCommentThread alertId={alert.id} isCompleted={visible === "resolved"} />
                    </div>

                    {/* Saved resolution notes (legacy) */}
                    {alert.resolution_notes && (
                      <div className="rounded-md bg-muted p-3">
                        <p className="text-xs text-muted-foreground mb-1">Resolution notes:</p>
                        <p className="text-sm">{alert.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
