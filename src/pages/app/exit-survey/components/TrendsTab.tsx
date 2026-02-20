import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useActiveExitSurvey } from "@/hooks/useExitSurvey";
import { useMembership } from "@/lib/membership";
import { ArrowUp, ArrowDown } from "lucide-react";

const TIMEFRAMES = [
  { label: "30 Days", value: "30d", days: 30 },
  { label: "90 Days", value: "90d", days: 90 },
  { label: "180 Days", value: "180d", days: 180 },
  { label: "1 Year", value: "1y", days: 365 },
  { label: "Custom", value: "custom", days: null },
] as const;

type TimeframeValue = (typeof TIMEFRAMES)[number]["value"];

type ResponseRow = {
  id: string;
  question_id: string;
  submission_id: string;
  score: number | null;
  comment: string | null;
  exit_survey_submissions?: {
    submitted_at: string;
    patient_first_name: string | null;
    patient_last_name: string | null;
  } | null;
};

type QuestionStat = {
  avg: number | null;
  count: number;
  comments: {
    submissionId: string;
    submittedAt: string;
    patientName: string;
    score: number | null;
    comment: string;
  }[];
};

const DEPARTMENT_COLOR_PALETTE = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-rose-100 text-rose-700 border-rose-200",
];

function getDepartmentColor(dept: string | null, index: number) {
  if (!dept) return "bg-gray-100 text-gray-700 border-gray-200";
  return DEPARTMENT_COLOR_PALETTE[index % DEPARTMENT_COLOR_PALETTE.length];
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildRange(value: TimeframeValue, customStart: string, customEnd: string) {
  const now = new Date();
  if (value === "custom") {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null;
    if (!start || !end) return null;
    return { start, end };
  }

  const preset = TIMEFRAMES.find((t) => t.value === value);
  if (!preset?.days) return null;
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(start.getDate() - preset.days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function shiftRange(range: { start: Date; end: Date }) {
  const durationMs = range.end.getTime() - range.start.getTime();
  const prevEnd = new Date(range.start);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart, end: prevEnd };
}

async function fetchResponsesForRange(
  companyId: string,
  startISO: string,
  endISO: string
): Promise<ResponseRow[]> {
  const { data, error } = await supabase
    .from("exit_survey_responses")
    .select(
      "id, question_id, submission_id, score, comment, exit_survey_submissions(submitted_at, patient_first_name, patient_last_name)"
    )
    .eq("exit_survey_submissions.company_id", companyId)
    .gte("exit_survey_submissions.submitted_at", startISO)
    .lte("exit_survey_submissions.submitted_at", endISO);

  if (error) throw error;
  return (data || []) as ResponseRow[];
}

function computeStats(rows: ResponseRow[]): Record<string, QuestionStat> {
  const stats: Record<string, QuestionStat> = {};

  for (const row of rows) {
    if (!stats[row.question_id]) {
      stats[row.question_id] = { avg: null, count: 0, comments: [] };
    }

    if (row.score !== null) {
      const entry = stats[row.question_id];
      entry.count += 1;
      entry.avg = (entry.avg ?? 0) + row.score;
    }

    if (row.comment && row.comment.trim()) {
      const submittedAt = row.exit_survey_submissions?.submitted_at ?? "";
      const patientName =
        row.exit_survey_submissions?.patient_first_name ||
        row.exit_survey_submissions?.patient_last_name
          ? `${row.exit_survey_submissions?.patient_first_name ?? ""} ${row.exit_survey_submissions?.patient_last_name ?? ""}`.trim()
          : "Anonymous";
      stats[row.question_id].comments.push({
        submissionId: row.submission_id,
        submittedAt,
        patientName,
        score: row.score,
        comment: row.comment,
      });
    }
  }

  for (const entry of Object.values(stats)) {
    if (entry.count > 0 && entry.avg !== null) {
      entry.avg = parseFloat((entry.avg / entry.count).toFixed(2));
    } else {
      entry.avg = null;
    }

    entry.comments = entry.comments
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, 3);
  }

  return stats;
}

export function TrendsTab() {
  const { activeCompanyId } = useMembership();
  const { questions } = useActiveExitSurvey();
  const [timeframe, setTimeframe] = useState<TimeframeValue>("90d");
  const [customStart, setCustomStart] = useState<string>(formatDateInput(new Date()));
  const [customEnd, setCustomEnd] = useState<string>(formatDateInput(new Date()));

  const range = useMemo(() => buildRange(timeframe, customStart, customEnd), [timeframe, customStart, customEnd]);
  const prevRange = useMemo(() => (range ? shiftRange(range) : null), [range]);

  const statsQuery = useQuery({
    queryKey: ["exit-survey-leadership", activeCompanyId, range?.start.toISOString(), range?.end.toISOString()],
    queryFn: async () => {
      if (!activeCompanyId || !range || !prevRange) return null;
      const [currentRows, prevRows] = await Promise.all([
        fetchResponsesForRange(activeCompanyId, range.start.toISOString(), range.end.toISOString()),
        fetchResponsesForRange(activeCompanyId, prevRange.start.toISOString(), prevRange.end.toISOString()),
      ]);
      return {
        current: computeStats(currentRows),
        previous: computeStats(prevRows),
      };
    },
    enabled: !!activeCompanyId && !!range && !!prevRange,
  });

  const scoredQuestions = (questions.data || []).filter((q) => q.type === "scored");

  const groupedByDepartment = useMemo(() => {
    const groups: { department: string; questions: typeof scoredQuestions }[] = [];
    const indexByDepartment = new Map<string, number>();

    for (const q of scoredQuestions) {
      const key = q.department || "General";
      if (!indexByDepartment.has(key)) {
        indexByDepartment.set(key, groups.length);
        groups.push({ department: key, questions: [] });
      }
      groups[indexByDepartment.get(key)!].questions.push(q);
    }

    return groups;
  }, [scoredQuestions]);

  const trendList = useMemo(() => {
    if (!statsQuery.data) return [] as { id: string; delta: number; avg: number | null; text: string }[];
    return scoredQuestions.map((q) => {
      const current = statsQuery.data.current[q.id]?.avg ?? null;
      const previous = statsQuery.data.previous[q.id]?.avg ?? null;
      const delta = current !== null && previous !== null ? parseFloat((current - previous).toFixed(2)) : 0;
      return { id: q.id, delta, avg: current, text: q.text };
    });
  }, [statsQuery.data, scoredQuestions]);

  const trendingUp = trendList.filter((t) => t.delta > 0.05).sort((a, b) => b.delta - a.delta);
  const trendingDown = trendList.filter((t) => t.delta < -0.05).sort((a, b) => a.delta - b.delta);

  return (
    <div className="space-y-6">
      {/* Timeframe filters */}
      <div className="flex flex-wrap items-center gap-2">
        {TIMEFRAMES.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant={timeframe === t.value ? "default" : "outline"}
            onClick={() => setTimeframe(t.value)}
            className={timeframe === t.value ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
          >
            {t.label}
          </Button>
        ))}
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link to="/app/exit-survey?tab=submissions">View Submissions</Link>
        </Button>
        {timeframe === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 rounded-md border px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 rounded-md border px-2 text-xs"
            />
          </div>
        )}
      </div>

      {/* Trending sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-2 bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Questions Trending Up
            </span>
          </div>
          <div className="p-4 space-y-2">
            {statsQuery.isLoading ? (
              <Skeleton className="h-6 w-full" />
            ) : !range ? (
              <p className="text-xs text-muted-foreground">Select a valid date range.</p>
            ) : trendingUp.length ? (
              trendingUp.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="line-clamp-1">{t.text}</span>
                  <span className="flex items-center text-green-600 text-xs font-semibold">
                    <ArrowUp className="w-3 h-3 mr-1" /> +{t.delta.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No questions trending up.</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-2 bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Questions Trending Down
            </span>
          </div>
          <div className="p-4 space-y-2">
            {statsQuery.isLoading ? (
              <Skeleton className="h-6 w-full" />
            ) : !range ? (
              <p className="text-xs text-muted-foreground">Select a valid date range.</p>
            ) : trendingDown.length ? (
              trendingDown.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="line-clamp-1">{t.text}</span>
                  <span className="flex items-center text-red-600 text-xs font-semibold">
                    <ArrowDown className="w-3 h-3 mr-1" /> {t.delta.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No questions trending down.</p>
            )}
          </div>
        </div>
      </div>

      {/* Department groups */}
      <div className="space-y-4">
        {statsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !range ? (
          <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
            Select a valid date range to view leadership trends.
          </div>
        ) : groupedByDepartment.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
            No scored questions configured yet.
          </div>
        ) : (
          groupedByDepartment.map((group, index) => (
          <div key={group.department} className="rounded-lg border bg-white">
            <div className="border-b px-4 py-2 flex items-center gap-2 bg-muted/30">
              <Badge variant="outline" className={`text-xs ${getDepartmentColor(group.department, index)}`}>
                {group.department}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Department summary (colors are provisional pending configuration)
              </span>
            </div>
            <div className="p-4 space-y-4">
              {group.questions.map((q) => {
                const current = statsQuery.data?.current[q.id];
                const previous = statsQuery.data?.previous[q.id];
                const delta =
                  current?.avg !== null && previous?.avg !== null
                    ? parseFloat((current.avg - previous.avg).toFixed(2))
                    : null;

                return (
                  <div key={q.id} className="border rounded-md p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{q.question_number}</span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{q.text}</p>
                          {current ? (
                            <div className="flex items-center gap-2">
                              <ScoreBadge score={current.avg} />
                              {delta !== null && (
                                <TrendArrow delta={delta} />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No data</span>
                          )}
                        </div>
                        {current?.comments?.length ? (
                          <div className="mt-2 space-y-2">
                            {current.comments.map((c) => (
                              <div key={c.submissionId} className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{c.patientName}</span>{" "}
                                <span>({new Date(c.submittedAt).toLocaleDateString()})</span>
                                {c.score !== null && (
                                  <span className="ml-2 text-xs">Score: {c.score}</span>
                                )}
                                <div className="italic mt-1">"{c.comment}"</div>
                                <Link
                                  to={`/app/exit-survey/submissions/${c.submissionId}`}
                                  className="text-teal-700 hover:text-teal-900 text-xs"
                                >
                                  View response
                                </Link>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground italic">No comments in this timeframe.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
}

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

function TrendArrow({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="flex items-center text-xs font-semibold text-green-600">
        <ArrowUp className="w-3 h-3 mr-1" /> {delta.toFixed(2)}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center text-xs font-semibold text-red-600">
        <ArrowDown className="w-3 h-3 mr-1" /> {delta.toFixed(2)}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">0.00</span>;
}
