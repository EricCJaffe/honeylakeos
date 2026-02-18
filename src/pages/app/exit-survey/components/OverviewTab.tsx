import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useActiveExitSurvey,
  useExitSurveyKPIs,
  useExitSurveyAlerts,
  type DateFilter,
  type ExitSurveyQuestion,
} from "@/hooks/useExitSurvey";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Last 6 Months", value: "6mo" },
  { label: "Last 12 Months", value: "12mo" },
  { label: "All Time", value: "all" },
];

const CATEGORY_COLORS: Record<string, string> = {
  KPI: "bg-purple-100 text-purple-700 border-purple-200",
  Admissions: "bg-blue-100 text-blue-700 border-blue-200",
  "Patient Services": "bg-teal-100 text-teal-700 border-teal-200",
  "Treatment Team": "bg-green-100 text-green-700 border-green-200",
  "Treatment Program": "bg-indigo-100 text-indigo-700 border-indigo-200",
  Facility: "bg-orange-100 text-orange-700 border-orange-200",
};

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

function KpiCard({
  title,
  value,
  sub,
  color,
}: {
  title: string;
  value: string | number | null;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className={`text-2xl font-bold ${color ?? "text-foreground"}`}>
          {value ?? "—"}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function OverviewTab() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const { questions } = useActiveExitSurvey();
  const kpis = useExitSurveyKPIs(dateFilter);
  const alerts = useExitSurveyAlerts("pending");

  const scoredQuestions = (questions.data || []).filter((q) => q.type === "scored");
  const pendingAlertCount = (alerts.data || []).length;

  const overallColor =
    (kpis.data?.overallAvg ?? 0) >= 4.5
      ? "text-green-600"
      : (kpis.data?.overallAvg ?? 0) >= 3.5
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Date filter pills */}
      <div className="flex flex-wrap gap-2">
        {DATE_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={dateFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter(f.value)}
            className={dateFilter === f.value ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Submissions"
          value={kpis.isLoading ? "…" : kpis.data?.count ?? 0}
          sub={`${dateFilter === "all" ? "All time" : DATE_FILTERS.find((f) => f.value === dateFilter)?.label}`}
        />
        <KpiCard
          title="Overall Average"
          value={kpis.isLoading ? "…" : kpis.data?.overallAvg?.toFixed(2) ?? "—"}
          sub="Out of 5.00"
          color={overallColor}
        />
        <KpiCard
          title="Feel Better %"
          value={kpis.isLoading ? "…" : kpis.data?.feelBetterPct != null ? `${kpis.data.feelBetterPct}%` : "—"}
          sub="Score ≥ 4 on KPI"
        />
        <KpiCard
          title="Pending Alerts"
          value={pendingAlertCount}
          sub="Awaiting action"
          color={pendingAlertCount > 0 ? "text-red-600" : "text-green-600"}
        />
      </div>

      {/* Questions table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b">
          <h3 className="text-sm font-semibold text-foreground">Question Scores</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Question</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Dept</th>
              </tr>
            </thead>
            <tbody>
              {questions.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={4} className="px-4 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : (
                scoredQuestions.map((q) => (
                  <QuestionRow key={q.id} question={q} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function QuestionRow({ question }: { question: ExitSurveyQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = CATEGORY_COLORS[question.category] ?? "bg-gray-100 text-gray-700";

  return (
    <>
      <tr
        className="border-b hover:bg-muted/20 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 text-muted-foreground">{question.question_number}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="line-clamp-2">{question.text}</span>
            {expanded ? (
              <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <Badge variant="outline" className={`text-xs ${catColor}`}>
            {question.category}
          </Badge>
        </td>
        <td className="px-3 py-3 text-xs text-muted-foreground text-center">
          {question.department ?? "—"}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/10 border-b">
          <td colSpan={4} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Owner:</span>{" "}
                {question.owner_name ?? "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Email:</span>{" "}
                {question.owner_email ?? "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Alert threshold:</span>{" "}
                Score ≤ {question.comment_threshold ?? 3}
              </div>
              <div>
                <span className="font-medium text-foreground">Version:</span>{" "}
                {question.version}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
