import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useActiveExitSurvey, useExitSurveySettings } from "@/hooks/useExitSurvey";
import { useMembership } from "@/lib/membership";
import { ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAuditLog } from "@/hooks/useAuditLog";

const TIMEFRAMES = [
  { label: "30 Days", value: "30d", days: 30 },
  { label: "90 Days", value: "90d", days: 90 },
  { label: "180 Days", value: "180d", days: 180 },
  { label: "1 Year", value: "1y", days: 365 },
  { label: "Custom", value: "custom", days: null },
] as const;

const ROLLING_RANGES = [
  { key: "30d", label: "Last 30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
  { key: "180d", label: "180d", days: 180 },
  { key: "1y", label: "1y", days: 365 },
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
      "id, question_id, submission_id, score, comment, exit_survey_submissions!inner(submitted_at, patient_first_name, patient_last_name)"
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

function computeDailySeries(rows: ResponseRow[]) {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    if (row.score === null) continue;
    const submittedAt = row.exit_survey_submissions?.submitted_at;
    if (!submittedAt) continue;
    const day = submittedAt.split("T")[0];
    const entry = buckets.get(day) || { total: 0, count: 0 };
    entry.total += row.score;
    entry.count += 1;
    buckets.set(day, entry);
  }

  return Array.from(buckets.entries())
    .map(([day, entry]) => ({
      day,
      avg: entry.count ? parseFloat((entry.total / entry.count).toFixed(2)) : null,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export function TrendsTab() {
  const { activeCompanyId } = useMembership();
  const { log } = useAuditLog();
  const hasLoggedViewRef = useRef(false);
  const { questions } = useActiveExitSurvey();
  const { data: settings } = useExitSurveySettings();
  const [timeframe, setTimeframe] = useState<TimeframeValue>("90d");
  const [customStart, setCustomStart] = useState<string>(formatDateInput(new Date()));
  const [customEnd, setCustomEnd] = useState<string>(formatDateInput(new Date()));
  const [revealNames, setRevealNames] = useState(false);
  const phiSafeMode = settings?.phi_safe_email_mode === "true";

  const range = useMemo(() => buildRange(timeframe, customStart, customEnd), [timeframe, customStart, customEnd]);
  const prevRange = useMemo(() => (range ? shiftRange(range) : null), [range]);

  useEffect(() => {
    if (hasLoggedViewRef.current) return;
    hasLoggedViewRef.current = true;
    void log("exit_survey.trends_viewed", "exit_survey_submission", undefined, {
      source: "exit_survey_trends_tab",
    });
  }, [log]);

  const statsQuery = useQuery({
    queryKey: ["exit-survey-leadership", activeCompanyId, range?.start.toISOString(), range?.end.toISOString()],
    queryFn: async () => {
      if (!activeCompanyId || !range || !prevRange) return null;
      const [currentRows, prevRows] = await Promise.all([
        fetchResponsesForRange(activeCompanyId, range.start.toISOString(), range.end.toISOString()),
        fetchResponsesForRange(activeCompanyId, prevRange.start.toISOString(), prevRange.end.toISOString()),
      ]);
      const rollingResponses = await Promise.all(
        ROLLING_RANGES.map((r) => {
          const now = new Date();
          const end = new Date(now);
          end.setHours(23, 59, 59, 999);
          const start = new Date(now);
          start.setDate(start.getDate() - r.days);
          start.setHours(0, 0, 0, 0);
          return fetchResponsesForRange(activeCompanyId, start.toISOString(), end.toISOString());
        })
      );
      return {
        current: computeStats(currentRows),
        previous: computeStats(prevRows),
        currentRows,
        rolling: Object.fromEntries(
          ROLLING_RANGES.map((r, idx) => [r.key, computeStats(rollingResponses[idx])])
        ) as Record<string, Record<string, QuestionStat>>,
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
      const current = statsQuery.data?.current?.[q.id]?.avg ?? null;
      const previous = statsQuery.data?.previous?.[q.id]?.avg ?? null;
      const delta = current !== null && previous !== null ? parseFloat((current - previous).toFixed(2)) : 0;
      return { id: q.id, delta, avg: current, text: q.text };
    });
  }, [statsQuery.data, scoredQuestions]);

  const trendingUp = trendList.filter((t) => t.delta > 0.05).sort((a, b) => b.delta - a.delta);
  const trendingDown = trendList.filter((t) => t.delta < -0.05).sort((a, b) => a.delta - b.delta);

  const chartData = useMemo(() => {
    if (!statsQuery.data?.currentRows) return [];
    return computeDailySeries(statsQuery.data.currentRows);
  }, [statsQuery.data]);

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
        {phiSafeMode && (
          <>
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
              PHI-safe mode ON
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setRevealNames((prev) => !prev)}>
              {revealNames ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {revealNames ? "Mask Names" : "Reveal Names"}
            </Button>
          </>
        )}
      </div>

      {/* Score trend chart */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Score Trend (Selected Range)</h3>
          {range && (
            <span className="text-xs text-muted-foreground">
              {range.start.toLocaleDateString()} – {range.end.toLocaleDateString()}
            </span>
          )}
        </div>
        {statsQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !range ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Select a valid date range.
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No surveys in this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                tickFormatter={(value: string) => {
                  const [y, m, d] = value.split("-");
                  return `${m}/${d}`;
                }}
              />
              <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: number) => [typeof value === "number" ? value.toFixed(2) : value, "Avg Score"]}
                labelFormatter={(label: string) => `Date: ${label}`}
              />
              <Line type="monotone" dataKey="avg" stroke="#0f766e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
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

      {/* Rolling averages by question */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="border-b px-4 py-2 bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Rolling Averages By Question
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Question</th>
                {ROLLING_RANGES.map((r) => (
                  <th key={r.key} className="text-center px-3 py-2 font-medium text-muted-foreground">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statsQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ) : (
                scoredQuestions.map((q) => {
                  const rolling = statsQuery.data?.rolling || {};
                  const last30 = rolling["30d"]?.[q.id]?.avg ?? null;
                  const last90 = rolling["90d"]?.[q.id]?.avg ?? null;
                  const arrow =
                    last30 != null && last90 != null
                      ? last30 > last90
                        ? "up"
                        : last30 < last90
                        ? "down"
                        : "flat"
                      : "flat";

                  return (
                    <tr key={q.id} className="border-b hover:bg-muted/10">
                      <td className="px-4 py-2 text-muted-foreground">{q.question_number}</td>
                      <td className="px-4 py-2 text-xs max-w-xs truncate">{q.text}</td>
                      {ROLLING_RANGES.map((r) => {
                        const score = rolling[r.key]?.[q.id]?.avg ?? null;
                        return (
                          <td key={r.key} className="px-3 py-2 text-center">
                            <div className="inline-flex items-center gap-1 justify-center">
                              <ScoreBadge score={score} />
                              {r.key === "30d" && arrow !== "flat" && (
                                <TrendArrow delta={arrow === "up" ? 1 : -1} showValue={false} />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
                  current?.avg != null && previous?.avg != null
                    ? parseFloat((current.avg - previous.avg).toFixed(2))
                    : null;

                return (
                  <div key={q.id} className="border rounded-md p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{q.question_number}</span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{q.text}</p>
                          {current && current.avg != null ? (
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
                                <span className="font-medium text-foreground">
                                  {phiSafeMode && !revealNames && c.patientName !== "Anonymous"
                                    ? `Patient ${c.submissionId.slice(0, 6)}`
                                    : c.patientName}
                                </span>{" "}
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

function TrendArrow({ delta, showValue = true }: { delta: number; showValue?: boolean }) {
  if (delta > 0) {
    return (
      <span className="flex items-center text-xs font-semibold text-green-600">
        <ArrowUp className="w-3 h-3 mr-1" /> {showValue ? delta.toFixed(2) : ""}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center text-xs font-semibold text-red-600">
        <ArrowDown className="w-3 h-3 mr-1" /> {showValue ? delta.toFixed(2) : ""}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">0.00</span>;
}
