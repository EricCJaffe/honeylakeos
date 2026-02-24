import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, CheckCircle, CheckCheck } from "lucide-react";
import {
  useActiveExitSurvey,
  useExitSurveySubmission,
  useExitSurveySubmissionDetail,
  useExitSurveySubmissionAlerts,
  useExitSurveyAlertComments,
  useExitSurveyMutations,
  type ExitSurveyAlert,
} from "@/hooks/useExitSurvey";
import { useMembership } from "@/lib/membership";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { format } from "date-fns";

type VisibleStatus = "pending" | "acknowledged" | "resolved";

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

const COMMENT_TYPES = [
  { value: "leadership", label: "Leadership Perspective", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "actions", label: "Actions Taken", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "preventative", label: "Preventative Measures", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "general", label: "General Comment", color: "bg-gray-100 text-gray-700 border-gray-200" },
] as const;

function parseCommentType(comment: string): { type: string; text: string } {
  const match = comment.match(/^\[(.*?)\]\s*/);
  if (match) {
    const typeLabel = match[1];
    const type = COMMENT_TYPES.find(t => t.label === typeLabel);
    return {
      type: type?.value || "general",
      text: comment.slice(match[0].length),
    };
  }
  // Check for old format with "Label:\n" pattern
  if (comment.includes("Leadership Perspective:")) return { type: "leadership", text: comment };
  if (comment.includes("Actions Taken:")) return { type: "actions", text: comment };
  if (comment.includes("Preventative Measures:")) return { type: "preventative", text: comment };
  return { type: "general", text: comment };
}

function AlertCommentThread({
  alertId,
  isCompleted,
}: {
  alertId: string;
  isCompleted: boolean;
}) {
  const { data: comments, isLoading } = useExitSurveyAlertComments(alertId);
  const { addAlertComment } = useExitSurveyMutations();
  const [commentType, setCommentType] = useState<string>("general");
  const [commentText, setCommentText] = useState("");

  function handleSubmit() {
    if (!commentText.trim()) return;

    const selectedType = COMMENT_TYPES.find(t => t.value === commentType);
    const formattedComment = `[${selectedType?.label}] ${commentText.trim()}`;

    addAlertComment.mutate({ alertId, comment: formattedComment });
    setCommentText("");
    setCommentType("general");
  }

  return (
    <div className="space-y-3">
      {/* Comment Thread */}
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (comments || []).length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(comments || []).map((c) => {
            const { type, text } = parseCommentType(c.comment);
            const typeConfig = COMMENT_TYPES.find(t => t.value === type) || COMMENT_TYPES[3];

            return (
              <div key={c.id} className="bg-muted/30 border rounded-md p-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">
                        {c.author_name || "Team member"}
                      </span>
                      <Badge variant="outline" className={`text-xs ${typeConfig.color} border`}>
                        {typeConfig.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-4 text-center">
          No comments yet. Be the first to add feedback!
        </p>
      )}

      {/* Add Comment Form */}
      {!isCompleted && (
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Select value={commentType} onValueChange={setCommentType}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-xs">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add your comment here..."
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {commentText.length > 0 && `${commentText.length} characters`}
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={addAlertComment.isPending || !commentText.trim()}
            >
              Add Comment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExitSurveySubmissionPage() {
  const navigate = useNavigate();
  const { submissionId } = useParams();
  const submission = useExitSurveySubmission(submissionId ?? null);
  const responses = useExitSurveySubmissionDetail(submissionId ?? null);
  const { questions } = useActiveExitSurvey();
  const { data: alerts } = useExitSurveySubmissionAlerts(submissionId ?? null);
  const { updateAlertStatus } = useExitSurveyMutations();
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const members = useCompanyMembers();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const canComplete = isCompanyAdmin || isSiteAdmin;

  const questionMap = useMemo(() => {
    return new Map((questions.data || []).map((q) => [q.id, q]));
  }, [questions.data]);

  const responseMap = useMemo(() => {
    return new Map((responses.data || []).map((r) => [r.question_id, r]));
  }, [responses.data]);

  const grouped = useMemo(() => {
    const groups: { category: string; questions: typeof questions.data }[] = [];
    const indexByCategory = new Map<string, number>();
    for (const q of questions.data || []) {
      if (q.type !== "scored") continue;
      const key = q.category || "General";
      if (!indexByCategory.has(key)) {
        indexByCategory.set(key, groups.length);
        groups.push({ category: key, questions: [] });
      }
      groups[indexByCategory.get(key)!].questions.push(q);
    }
    return groups;
  }, [questions.data]);

  const patientName = submission.data?.is_anonymous || (!submission.data?.patient_first_name && !submission.data?.patient_last_name)
    ? "Anonymous"
    : `${submission.data?.patient_first_name ?? ""} ${submission.data?.patient_last_name ?? ""}`.trim();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={submission.isLoading ? "Loading response…" : patientName}
        description={submission.data?.submitted_at ? new Date(submission.data.submitted_at).toLocaleString() : ""}
        actions={
          <Button variant="outline" onClick={() => navigate("/app/exit-survey?tab=submissions")}> 
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Submissions
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {submission.isLoading || questions.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {/* Alerts */}
            {alerts && alerts.length > 0 && (
              <div className="rounded-lg border bg-white">
                <div className="border-b px-4 py-2 bg-red-50">
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    ⚠️ Low Score Alerts ({alerts.length})
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {alerts.map((alert) => {
                    const visibleStatus = toVisible(alert.status);
                    const config = STATUS_CONFIG[visibleStatus];
                    const isExpanded = expandedAlert === alert.id;

                    return (
                      <div key={alert.id} className="border rounded-md">
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-1">
                                {alert.exit_survey_questions?.text || "Question"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {alert.exit_survey_questions?.department && (
                                  <span className="px-2 py-0.5 bg-muted rounded-full">
                                    {alert.exit_survey_questions.department}
                                  </span>
                                )}
                                <span>Score: {alert.score}</span>
                                <span>•</span>
                                <span>{format(new Date(alert.created_at), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className={`${config.color} border flex items-center gap-1`}>
                              {config.icon}
                              {config.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            {canComplete && (
                              <Select
                                value={visibleStatus}
                                onValueChange={(val: VisibleStatus) => {
                                  const dbStatus: ExitSurveyAlert["status"] =
                                    val === "resolved" ? "resolved" : val === "acknowledged" ? "acknowledged" : "pending";
                                  updateAlertStatus.mutate({ alertId: alert.id, status: dbStatus });
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                  <SelectItem value="resolved">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            )}

                            {alert.assigned_to && (
                              <span className="text-xs text-muted-foreground">
                                Assigned to: {members.data?.find((m) => m.user_id === alert.assigned_to)?.full_name || "Unknown"}
                              </span>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                              className="ml-auto text-xs h-7"
                            >
                              {isExpanded ? "Hide" : "View"} Comments
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t">
                              <AlertCommentThread
                                alertId={alert.id}
                                isCompleted={visibleStatus === "resolved"}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category sections */}
            {grouped.map((group) => (
              <div key={group.category} className="rounded-lg border bg-white">
                <div className="border-b px-4 py-2 bg-muted/30">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.category}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {group.questions.map((q) => {
                    const response = responseMap.get(q.id);
                    const score = response?.score ?? null;
                    return (
                      <div key={q.id} className="border rounded-md p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground w-5 shrink-0">
                            {q.question_number}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">{q.text}</p>
                            <div className="flex items-center gap-2">
                              {score !== null ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    score >= 4
                                      ? "border-green-300 text-green-700"
                                      : score >= 3
                                      ? "border-yellow-300 text-yellow-700"
                                      : "border-red-300 text-red-700"
                                  }`}
                                >
                                  {score}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">No score</span>
                              )}
                            </div>
                            {response?.comment && (
                              <p className="text-xs text-muted-foreground mt-2 italic">"{response.comment}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Open-ended */}
            {(submission.data?.open_ended_improvement || submission.data?.open_ended_positive) && (
              <div className="rounded-lg border bg-white">
                <div className="border-b px-4 py-2 bg-muted/30">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Open-Ended Responses
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {submission.data?.open_ended_improvement && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">What could we improve?</p>
                      <p className="text-sm">{submission.data.open_ended_improvement}</p>
                    </div>
                  )}
                  {submission.data?.open_ended_positive && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">What did we do particularly well?</p>
                      <p className="text-sm">{submission.data.open_ended_positive}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Care team */}
            {(submission.data?.psych_provider || submission.data?.primary_therapist || submission.data?.case_manager) && (
              <div className="rounded-lg border bg-white">
                <div className="border-b px-4 py-2 bg-muted/30">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Care Team
                  </span>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  {submission.data?.psych_provider && (
                    <p>
                      <span className="text-muted-foreground">Psych Provider:</span> {submission.data.psych_provider}
                    </p>
                  )}
                  {submission.data?.primary_therapist && (
                    <p>
                      <span className="text-muted-foreground">Primary Therapist:</span> {submission.data.primary_therapist}
                    </p>
                  )}
                  {submission.data?.case_manager && (
                    <p>
                      <span className="text-muted-foreground">Case Manager:</span> {submission.data.case_manager}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
