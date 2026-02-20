import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import {
  useActiveExitSurvey,
  useExitSurveySubmission,
  useExitSurveySubmissionDetail,
} from "@/hooks/useExitSurvey";

export default function ExitSurveySubmissionPage() {
  const navigate = useNavigate();
  const { submissionId } = useParams();
  const submission = useExitSurveySubmission(submissionId ?? null);
  const responses = useExitSurveySubmissionDetail(submissionId ?? null);
  const { questions } = useActiveExitSurvey();

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
