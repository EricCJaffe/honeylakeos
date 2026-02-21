import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useExitSurveyKPIs,
  useExitSurveyAlerts,
  type DateFilter,
} from "@/hooks/useExitSurvey";
import { Skeleton } from "@/components/ui/skeleton";

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Last 6 Months", value: "6mo" },
  { label: "Last 12 Months", value: "12mo" },
  { label: "All Time", value: "all" },
];

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
  const kpis = useExitSurveyKPIs(dateFilter);
  const alerts = useExitSurveyAlerts("pending");

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

    </div>
  );
}
