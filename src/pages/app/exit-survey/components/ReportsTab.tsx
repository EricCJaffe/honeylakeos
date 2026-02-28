import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DATE_FILTERS = [
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Last 6 Months", value: "6mo" },
  { label: "Last 12 Months", value: "12mo" },
  { label: "All Time", value: "all" },
] as const;

type DateFilter = (typeof DATE_FILTERS)[number]["value"];

type ResponseReportRow = {
  score: number | null;
  comment: string | null;
  exit_survey_questions: {
    text: string | null;
    department: string | null;
    owner_name: string | null;
  } | null;
  exit_survey_submissions: {
    submitted_at: string;
  } | null;
};

type AggregateRow = {
  key: string;
  count: number;
  avg: number | null;
  lowScoreCount: number;
  commentRate: number;
};

function getCutoffIso(dateFilter: DateFilter): string | null {
  if (dateFilter === "all") return null;
  const cutoff = new Date();
  if (dateFilter === "30d") cutoff.setDate(cutoff.getDate() - 30);
  else if (dateFilter === "90d") cutoff.setDate(cutoff.getDate() - 90);
  else if (dateFilter === "6mo") cutoff.setMonth(cutoff.getMonth() - 6);
  else if (dateFilter === "12mo") cutoff.setMonth(cutoff.getMonth() - 12);
  return cutoff.toISOString();
}

function toAggregate(rows: ResponseReportRow[], groupBy: "department" | "owner_name"): AggregateRow[] {
  const grouped = new Map<string, { total: number; scoredCount: number; low: number; comments: number }>();

  for (const row of rows) {
    const key = (row.exit_survey_questions?.[groupBy] || "Unassigned").trim();
    const existing = grouped.get(key) || { total: 0, scoredCount: 0, low: 0, comments: 0 };

    if (row.score !== null) {
      existing.total += row.score;
      existing.scoredCount += 1;
      if (row.score <= 2) existing.low += 1;
    }
    if ((row.comment || "").trim()) {
      existing.comments += 1;
    }
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .map(([key, values]) => ({
      key,
      count: values.scoredCount,
      avg: values.scoredCount > 0 ? parseFloat((values.total / values.scoredCount).toFixed(2)) : null,
      lowScoreCount: values.low,
      commentRate: values.scoredCount > 0 ? Math.round((values.comments / values.scoredCount) * 100) : 0,
    }))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function AggregateTable({ title, rows }: { title: string; rows: AggregateRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data in selected range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2">Group</th>
                  <th className="text-right py-2 px-2">Avg</th>
                  <th className="text-right py-2 px-2">Responses</th>
                  <th className="text-right py-2 px-2">Low Score (&lt;=2)</th>
                  <th className="text-right py-2 pl-2">Comment Rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b last:border-b-0">
                    <td className="py-2 pr-2">{row.key}</td>
                    <td className="py-2 px-2 text-right">{row.avg !== null ? row.avg.toFixed(2) : "-"}</td>
                    <td className="py-2 px-2 text-right">{row.count}</td>
                    <td className="py-2 px-2 text-right">{row.lowScoreCount}</td>
                    <td className="py-2 pl-2 text-right">{row.commentRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsTab() {
  const { activeCompanyId } = useMembership();
  const [dateFilter, setDateFilter] = useState<DateFilter>("90d");

  const query = useQuery({
    queryKey: ["exit-survey-advanced-reports", activeCompanyId, dateFilter],
    queryFn: async () => {
      if (!activeCompanyId) return [] as ResponseReportRow[];

      let q = supabase
        .from("exit_survey_responses")
        .select("score, comment, exit_survey_questions!inner(text, department, owner_name), exit_survey_submissions!inner(submitted_at, company_id)")
        .eq("exit_survey_submissions.company_id", activeCompanyId);

      const cutoff = getCutoffIso(dateFilter);
      if (cutoff) {
        q = q.gte("exit_survey_submissions.submitted_at", cutoff);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ResponseReportRow[];
    },
    enabled: !!activeCompanyId,
  });

  const report = useMemo(() => {
    const rows = query.data || [];
    const scored = rows.filter((r) => r.score !== null);
    const avg = scored.length
      ? parseFloat((scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length).toFixed(2))
      : null;
    const lowCount = scored.filter((r) => (r.score ?? 0) <= 2).length;
    const department = toAggregate(rows, "department");
    const owners = toAggregate(rows, "owner_name");

    return {
      totalResponses: scored.length,
      averageScore: avg,
      lowScoreCount: lowCount,
      lowScoreRate: scored.length ? Math.round((lowCount / scored.length) * 100) : 0,
      department,
      owners,
    };
  }, [query.data]);

  function exportReportCsv() {
    const deptRows = report.department.map((r) => [r.key, r.avg ?? "", r.count, r.lowScoreCount, `${r.commentRate}%`]);
    const ownerRows = report.owners.map((r) => [r.key, r.avg ?? "", r.count, r.lowScoreCount, `${r.commentRate}%`]);

    const rows: (string | number)[][] = [
      ["Section", "Group", "Avg", "Responses", "LowScoreCount", "CommentRate"],
      ...deptRows.map((r) => ["Department", ...r]),
      ...ownerRows.map((r) => ["Owner", ...r]),
    ];

    downloadCsv(
      `exit-survey-advanced-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rows[0].map(String),
      rows.slice(1)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {DATE_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={dateFilter === f.value ? "default" : "outline"}
            onClick={() => setDateFilter(f.value)}
            className={dateFilter === f.value ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
          >
            {f.label}
          </Button>
        ))}

        <Button variant="outline" size="sm" className="ml-auto" onClick={exportReportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Scored Responses</p>
              <p className="text-2xl font-bold">{report.totalResponses}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Average Score</p>
              <p className="text-2xl font-bold">{report.averageScore !== null ? report.averageScore.toFixed(2) : "-"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Low Score Responses</p>
              <p className="text-2xl font-bold text-red-600">{report.lowScoreCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Low Score Rate</p>
              <p className="text-2xl font-bold">{report.lowScoreRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      <AggregateTable title="Department Performance" rows={report.department} />
      <AggregateTable title="Owner Performance" rows={report.owners} />
    </div>
  );
}
