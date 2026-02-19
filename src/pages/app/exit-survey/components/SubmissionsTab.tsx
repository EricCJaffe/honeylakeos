import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useExitSurveySubmissions,
  useExitSurveySubmissionDetail,
  useActiveExitSurvey,
  useExitSurveyAlerts,
  useExitSurveyAlertComments,
  useExitSurveyMutations,
  type ExitSurveySubmission,
  type ExitSurveyAlert,
  type DateFilter,
} from "@/hooks/useExitSurvey";
import { Search, ChevronLeft, ChevronRight, Eye, AlertTriangle, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "6mo", value: "6mo" },
  { label: "12mo", value: "12mo" },
  { label: "All", value: "all" },
];

// ---- 3-state status helpers (mirrors AlertsTab) ----
type VisibleStatus = "pending" | "acknowledged" | "resolved";

const VISIBLE_STATUSES: { value: VisibleStatus; label: string; activeColor: string }[] = [
  { value: "pending",      label: "Pending",      activeColor: "bg-red-100 text-red-700 border-red-300" },
  { value: "acknowledged", label: "Acknowledged",  activeColor: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: "resolved",     label: "Completed",     activeColor: "bg-green-100 text-green-700 border-green-300" },
];

function toVisible(status: ExitSurveyAlert["status"]): VisibleStatus {
  if (status === "resolved") return "resolved";
  if (status === "acknowledged" || status === "reviewed" || status === "action_taken") return "acknowledged";
  return "pending";
}

// ---- Sub-components ----

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color =
    score >= 4.5
      ? "bg-green-100 text-green-700 border-green-300"
      : score >= 3.5
      ? "bg-yellow-100 text-yellow-700 border-yellow-300"
      : "bg-red-100 text-red-700 border-red-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {score.toFixed(2)}
    </span>
  );
}

function ScoreHeatmap({ submissionId }: { submissionId: string }) {
  const { data: responses } = useExitSurveySubmissionDetail(submissionId);
  const sorted = (responses || [])
    .filter((r) => r.score !== null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="flex flex-wrap gap-0.5">
      {sorted.map((r) => {
        const color =
          r.score === 5 ? "bg-green-500"
          : r.score === 4 ? "bg-teal-400"
          : r.score === 3 ? "bg-yellow-400"
          : r.score === 2 ? "bg-orange-400"
          : "bg-red-500";
        return (
          <div key={r.id} title={`Score: ${r.score}`} className={`w-3 h-3 rounded-sm ${color}`} />
        );
      })}
    </div>
  );
}

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
    <div className="space-y-2">
      {isLoading ? (
        <Skeleton className="h-6 w-full" />
      ) : (comments || []).length > 0 ? (
        <div className="space-y-1.5">
          {(comments || []).map((c) => (
            <div key={c.id} className="bg-background border rounded px-2.5 py-1.5">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-medium">{c.author_name || "Team member"}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(c.created_at), "MMM d 'at' h:mm a")}
                </span>
              </div>
              <p className="text-xs whitespace-pre-wrap">{c.comment}</p>
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
            className="resize-none text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSubmit}
            disabled={!draft.trim() || addAlertComment.isPending}
            className="shrink-0 mt-0.5 h-7 w-7 p-0"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Main tab ----

export function SubmissionsTab() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailSubmission, setDetailSubmission] = useState<ExitSurveySubmission | null>(null);

  const PAGE_SIZE = 20;

  const { data, isLoading } = useExitSurveySubmissions({
    dateFilter,
    page,
    pageSize: PAGE_SIZE,
    search,
  });

  const submissions = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {DATE_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={dateFilter === f.value ? "default" : "outline"}
              onClick={() => { setDateFilter(f.value); setPage(1); }}
              className={dateFilter === f.value ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {totalCount} submission{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Patient</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Score</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Heatmap</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/10">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.submitted_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      {s.is_anonymous || (!s.patient_first_name && !s.patient_last_name)
                        ? <span className="text-muted-foreground italic text-xs">Anonymous</span>
                        : <span className="font-medium">{s.patient_first_name} {s.patient_last_name}</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ScoreBadge score={s.overall_average} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreHeatmap submissionId={s.id} />
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailSubmission(s)}
                        className="h-7 gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Detail Sheet */}
      <SubmissionDetailSheet
        submission={detailSubmission}
        onClose={() => setDetailSubmission(null)}
      />
    </div>
  );
}

// ---- Detail sheet ----

function SubmissionDetailSheet({
  submission,
  onClose,
}: {
  submission: ExitSurveySubmission | null;
  onClose: () => void;
}) {
  const { data: responses } = useExitSurveySubmissionDetail(submission?.id ?? null);
  const { questions } = useActiveExitSurvey();
  const { data: allAlerts } = useExitSurveyAlerts();
  const { updateAlertStatus } = useExitSurveyMutations();
  const questionMap = Object.fromEntries((questions.data || []).map((q) => [q.id, q]));

  // Map question_id → alert for this submission (only active alerts)
  const alertByQuestionId: Record<string, ExitSurveyAlert> = {};
  if (submission && allAlerts) {
    for (const a of allAlerts) {
      if (a.submission_id === submission.id) {
        alertByQuestionId[a.question_id] = a as ExitSurveyAlert;
      }
    }
  }

  // Track which alert threads are expanded
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});

  function toggleAlertThread(alertId: string) {
    setExpandedAlerts((prev) => ({ ...prev, [alertId]: !prev[alertId] }));
  }

  function handleSetStatus(alertId: string, next: VisibleStatus) {
    updateAlertStatus.mutate({ alertId, status: next === "resolved" ? "resolved" : next });
  }

  if (!submission) return null;

  return (
    <Sheet open={!!submission} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {submission.is_anonymous || (!submission.patient_first_name && !submission.patient_last_name)
              ? "Anonymous Submission"
              : `${submission.patient_first_name} ${submission.patient_last_name}`}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(submission.submitted_at), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </SheetHeader>

        {/* Category averages */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            ["Overall", submission.overall_average],
            ["KPI", submission.kpi_avg],
            ["Admissions", submission.admissions_avg],
            ["Patient Services", submission.patient_services_avg],
            ["Treatment Team", submission.treatment_team_avg],
            ["Treatment Program", submission.treatment_program_avg],
            ["Facility", submission.facility_avg],
          ].map(([label, val]) => (
            <div key={label as string} className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold text-sm">
                {val != null ? (val as number).toFixed(2) : "—"}
              </p>
            </div>
          ))}
        </div>

        {/* Individual responses — alerts inline */}
        <div className="space-y-3 mb-5">
          <h4 className="text-sm font-semibold">Responses</h4>
          {(responses || []).map((r) => {
            const q = questionMap[r.question_id];
            const alert = alertByQuestionId[r.question_id];
            const isCompleted = alert ? toVisible(alert.status) === "resolved" : false;
            const threadOpen = alert ? !!expandedAlerts[alert.id] : false;
            const visible = alert ? toVisible(alert.status) : null;

            return (
              <div
                key={r.id}
                className={`border rounded-md p-3 ${alert ? "border-red-200 bg-red-50/30" : ""}`}
              >
                {/* Response header */}
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-5 shrink-0">
                    {q?.question_number ?? "?"}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-1">
                      <p className="text-xs text-foreground flex-1">{q?.text ?? r.question_id}</p>
                      {alert && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" title="Alert triggered" />
                      )}
                    </div>
                    {r.score !== null && (
                      <Badge
                        variant="outline"
                        className={`text-xs mr-2 ${
                          (r.score ?? 0) >= 4
                            ? "border-green-300 text-green-700"
                            : (r.score ?? 0) >= 3
                            ? "border-yellow-300 text-yellow-700"
                            : "border-red-300 text-red-700"
                        }`}
                      >
                        {r.score}
                      </Badge>
                    )}
                    {r.comment && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{r.comment}"</p>
                    )}
                  </div>
                </div>

                {/* Inline alert controls — status + comments toggle */}
                {alert && (
                  <div className="mt-3 pt-2 border-t border-red-100 space-y-2">
                    {/* Status buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      {VISIBLE_STATUSES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => handleSetStatus(alert.id, s.value)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                            visible === s.value
                              ? s.activeColor + " ring-1 ring-offset-1 ring-current"
                              : "border-border text-muted-foreground bg-background hover:bg-muted"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                      {/* Comments toggle */}
                      <button
                        type="button"
                        onClick={() => toggleAlertThread(alert.id)}
                        className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {threadOpen ? "Hide" : "Comments"}
                      </button>
                    </div>

                    {/* Comment thread */}
                    {threadOpen && (
                      <AlertCommentThread alertId={alert.id} isCompleted={isCompleted} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Open-ended */}
        {(submission.open_ended_improvement || submission.open_ended_positive) && (
          <div className="space-y-3 mb-5">
            <h4 className="text-sm font-semibold">Open-Ended Responses</h4>
            {submission.open_ended_improvement && (
              <div className="border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">What could we improve?</p>
                <p className="text-sm">{submission.open_ended_improvement}</p>
              </div>
            )}
            {submission.open_ended_positive && (
              <div className="border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">What did we do particularly well?</p>
                <p className="text-sm">{submission.open_ended_positive}</p>
              </div>
            )}
          </div>
        )}

        {/* Providers */}
        {(submission.psych_provider || submission.primary_therapist || submission.case_manager) && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Care Team</h4>
            {submission.psych_provider && (
              <p className="text-xs text-muted-foreground">
                Psych Provider: <span className="text-foreground">{submission.psych_provider}</span>
              </p>
            )}
            {submission.primary_therapist && (
              <p className="text-xs text-muted-foreground">
                Primary Therapist: <span className="text-foreground">{submission.primary_therapist}</span>
              </p>
            )}
            {submission.case_manager && (
              <p className="text-xs text-muted-foreground">
                Case Manager: <span className="text-foreground">{submission.case_manager}</span>
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
