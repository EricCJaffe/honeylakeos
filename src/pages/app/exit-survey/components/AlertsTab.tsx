import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useExitSurveyAlerts,
  useExitSurveyMutations,
  useExitSurveyAlertComments,
  useExitSurveySettings,
  type ExitSurveyAlert,
} from "@/hooks/useExitSurvey";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useMembership } from "@/lib/membership";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, CheckCheck, MessageSquare, Eye, EyeOff } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";

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

function AlertCommentThread({
  alertId,
  isCompleted,
  canComplete,
}: {
  alertId: string;
  isCompleted: boolean;
  canComplete: boolean;
}) {
  const { data: comments, isLoading } = useExitSurveyAlertComments(alertId);
  const { addAlertComment } = useExitSurveyMutations();
  const [leadershipPerspective, setLeadershipPerspective] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [preventativeMeasures, setPreventativeMeasures] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");

  function handleSubmit() {
    const sections = [
      ["Leadership Perspective", leadershipPerspective],
      ["Actions Taken", actionsTaken],
      ["Preventative Measures", preventativeMeasures],
      ["Additional Comments", additionalComments],
    ]
      .filter(([, value]) => value.trim())
      .map(([label, value]) => `${label}:\n${value.trim()}`);

    if (!sections.length) return;

    addAlertComment.mutate({ alertId, comment: sections.join("\n\n") });
    setLeadershipPerspective("");
    setActionsTaken("");
    setPreventativeMeasures("");
    setAdditionalComments("");
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
        <p className="text-xs text-muted-foreground italic">No feedback yet.</p>
      )}

      {!isCompleted && (
        <div className="space-y-2">
          <Textarea
            value={leadershipPerspective}
            onChange={(e) => setLeadershipPerspective(e.target.value)}
            placeholder="Leadership perspective"
            rows={2}
            className="resize-none text-sm"
          />
          <Textarea
            value={actionsTaken}
            onChange={(e) => setActionsTaken(e.target.value)}
            placeholder="Actions taken"
            rows={2}
            className="resize-none text-sm"
          />
          <Textarea
            value={preventativeMeasures}
            onChange={(e) => setPreventativeMeasures(e.target.value)}
            placeholder="Preventative measures"
            rows={2}
            className="resize-none text-sm"
          />
          <Textarea
            value={additionalComments}
            onChange={(e) => setAdditionalComments(e.target.value)}
            placeholder="Additional comments"
            rows={2}
            className="resize-none text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSubmit}
              disabled={
                addAlertComment.isPending ||
                !(
                  leadershipPerspective.trim() ||
                  actionsTaken.trim() ||
                  preventativeMeasures.trim() ||
                  additionalComments.trim()
                )
              }
            >
              Submit Feedback
            </Button>
            {!canComplete && (
              <span className="text-xs text-muted-foreground">
                Admin review required to complete.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AlertsTab() {
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const { log } = useAuditLog();
  const hasLoggedViewRef = useRef(false);
  const { toast } = useToast();
  const { data: alerts, isLoading } = useExitSurveyAlerts();
  const { data: settings } = useExitSurveySettings();
  const { updateAlertStatus, assignAlert } = useExitSurveyMutations();
  const members = useCompanyMembers();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [revealNames, setRevealNames] = useState(false);
  const phiSafeMode = settings?.phi_safe_email_mode === "true";

  const alertList = (alerts || []) as AlertWithRelations[];
  const memberMap = new Map((members.data || []).map((m) => [m.user_id, m]));

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

  useEffect(() => {
    if (hasLoggedViewRef.current) return;
    hasLoggedViewRef.current = true;
    void log("exit_survey.alerts_viewed", "exit_survey_alert", undefined, {
      source: "exit_survey_alerts_tab",
    });
  }, [log]);

  function handleSetStatus(alertId: string, next: VisibleStatus) {
    const canComplete = isCompanyAdmin || isSiteAdmin;
    if (next === "resolved" && !canComplete) {
      toast({
        title: "Admin review required",
        description: "Only admins can mark this task as completed.",
        variant: "destructive",
      });
      return;
    }
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

      {phiSafeMode && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
            PHI-safe mode ON
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setRevealNames((prev) => !prev)}>
            {revealNames ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {revealNames ? "Mask Names" : "Reveal Names"}
          </Button>
        </div>
      )}

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
            const displayName =
              phiSafeMode && !revealNames && patientName !== "Anonymous"
                ? `Patient ${alert.submission_id.slice(0, 6)}`
                : patientName;

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
                      <span className="text-xs text-muted-foreground">{displayName}</span>
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
                            disabled={
                              updateAlertStatus.isPending ||
                              (s.value === "resolved" && !(isCompanyAdmin || isSiteAdmin))
                            }
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

                    {/* Assignee selector */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Assignee
                      </p>
                      {isCompanyAdmin || isSiteAdmin ? (
                        <Select
                          value={alert.assigned_to ?? "unassigned"}
                          onValueChange={(value) => {
                            assignAlert.mutate({
                              alertId: alert.id,
                              assignedTo: value === "unassigned" ? null : value,
                            });
                          }}
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Admin (default)</SelectItem>
                            {(members.data || []).map((m) => (
                              <SelectItem key={m.user_id} value={m.user_id}>
                                {m.full_name || m.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {alert.assigned_to ? memberMap.get(alert.assigned_to)?.full_name || memberMap.get(alert.assigned_to)?.email : "Admin (default)"}
                        </p>
                      )}
                    </div>

                    {/* Comments thread */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Leadership Feedback
                      </p>
                      <AlertCommentThread
                        alertId={alert.id}
                        isCompleted={visible === "resolved"}
                        canComplete={isCompanyAdmin || isSiteAdmin}
                      />
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
