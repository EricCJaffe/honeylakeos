import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useExitSurveyAlerts,
  useExitSurveyMutations,
  type ExitSurveyAlert,
} from "@/hooks/useExitSurvey";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, ClipboardCheck, CheckCheck } from "lucide-react";

const STATUS_ORDER: ExitSurveyAlert["status"][] = [
  "pending",
  "acknowledged",
  "reviewed",
  "action_taken",
  "resolved",
];

const STATUS_CONFIG: Record<
  ExitSurveyAlert["status"],
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
  reviewed: {
    label: "Reviewed",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <ClipboardCheck className="w-3.5 h-3.5" />,
  },
  action_taken: {
    label: "Action Taken",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <CheckCheck className="w-3.5 h-3.5" />,
  },
  resolved: {
    label: "Resolved",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
};

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

export function AlertsTab() {
  const { data: alerts, isLoading } = useExitSurveyAlerts();
  const { updateAlertStatus } = useExitSurveyMutations();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const alertList = (alerts || []) as AlertWithRelations[];

  // Sort: pending first, then by score ascending, then by date
  const sorted = [...alertList].sort((a, b) => {
    const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    return a.score - b.score;
  });

  // Count by status
  const countByStatus = STATUS_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: alertList.filter((a) => a.status === s).length }),
    {} as Record<string, number>
  );

  function nextStatus(status: ExitSurveyAlert["status"]): ExitSurveyAlert["status"] | null {
    const idx = STATUS_ORDER.indexOf(status);
    return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  }

  function handleAdvance(alert: AlertWithRelations) {
    const next = nextStatus(alert.status);
    if (!next) return;
    const notes = next === "resolved" ? resolutionNotes[alert.id] : undefined;
    updateAlertStatus.mutate({ alertId: alert.id, status: next, notes });
  }

  return (
    <div className="space-y-6">
      {/* Status KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["pending", "acknowledged", "reviewed", "action_taken"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <Card key={s}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`p-1 rounded border ${cfg.color}`}>{cfg.icon}</span>
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold">{countByStatus[s] ?? 0}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))
        ) : sorted.length === 0 ? (
          <div className="border rounded-lg p-10 text-center text-muted-foreground text-sm">
            No alerts. All scores are above threshold.
          </div>
        ) : (
          sorted.map((alert) => {
            const statusCfg = STATUS_CONFIG[alert.status];
            const isExpanded = expandedAlert === alert.id;
            const next = nextStatus(alert.status);
            const submission = alert.exit_survey_submissions;
            const question = alert.exit_survey_questions;
            const patientName =
              submission?.patient_first_name || submission?.patient_last_name
                ? `${submission.patient_first_name ?? ""} ${submission.patient_last_name ?? ""}`.trim()
                : "Anonymous";

            return (
              <div
                key={alert.id}
                className="border rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/10"
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                >
                  {/* Priority dot */}
                  <span
                    className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                      PRIORITY_CONFIG[alert.priority]
                    }`}
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

                  <Badge variant="outline" className={`text-xs shrink-0 ${statusCfg.color}`}>
                    {statusCfg.label}
                  </Badge>
                </div>

                {/* Expanded actions */}
                {isExpanded && (
                  <div className="border-t bg-muted/5 p-4 space-y-3">
                    {alert.status === "action_taken" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Resolution notes (optional)</p>
                        <Textarea
                          value={resolutionNotes[alert.id] ?? ""}
                          onChange={(e) =>
                            setResolutionNotes((prev) => ({ ...prev, [alert.id]: e.target.value }))
                          }
                          placeholder="Describe what action was taken..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                      </div>
                    )}
                    {alert.resolution_notes && (
                      <div className="rounded-md bg-muted p-3">
                        <p className="text-xs text-muted-foreground mb-1">Resolution notes:</p>
                        <p className="text-sm">{alert.resolution_notes}</p>
                      </div>
                    )}
                    {next && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvance(alert)}
                        disabled={updateAlertStatus.isPending}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        Mark as {STATUS_CONFIG[next].label}
                      </Button>
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
