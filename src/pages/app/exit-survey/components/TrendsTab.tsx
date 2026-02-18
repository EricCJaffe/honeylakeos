import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useExitSurveyTrends, useActiveExitSurvey } from "@/hooks/useExitSurvey";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { key: "KPI", color: "#8b5cf6" },
  { key: "Admissions", color: "#3b82f6" },
  { key: "Patient Services", color: "#14b8a6" },
  { key: "Treatment Team", color: "#22c55e" },
  { key: "Treatment Program", color: "#6366f1" },
  { key: "Facility", color: "#f97316" },
];

export function TrendsTab() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    CATEGORIES.map((c) => c.key)
  );

  const { data: trends, isLoading } = useExitSurveyTrends("monthly");
  const { questions } = useActiveExitSurvey();

  function toggleCategory(key: string) {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // Build chart data: group trends by period_label, pivot by category
  const periods = Array.from(new Set((trends || []).map((t) => t.period_label))).sort();
  const scoredQuestions = (questions.data || []).filter((q) => q.type === "scored");

  // For category-level chart, compute average across questions in that category per period
  const chartData = periods.map((period) => {
    const row: Record<string, unknown> = { period };
    for (const cat of CATEGORIES) {
      const catQuestionIds = scoredQuestions
        .filter((q) => q.category === cat.key)
        .map((q) => q.id);
      const relevantTrends = (trends || []).filter(
        (t) => t.period_label === period && catQuestionIds.includes(t.question_id ?? "")
      );
      if (relevantTrends.length > 0) {
        const avg =
          relevantTrends.reduce((sum, t) => sum + (t.avg_score ?? 0), 0) /
          relevantTrends.length;
        row[cat.key] = parseFloat(avg.toFixed(2));
      }
    }
    return row;
  });

  // Rolling averages table — last month, 3mo, 6mo, 12mo per question
  const rollingTypes = [
    { key: "rolling_30", label: "Last 30 Days" },
    { key: "rolling_3mo", label: "Last 3 Mo" },
    { key: "rolling_6mo", label: "Last 6 Mo" },
    { key: "rolling_12mo", label: "Last 12 Mo" },
  ];

  const { data: rolling30 } = useExitSurveyTrends("rolling_30");
  const { data: rolling3mo } = useExitSurveyTrends("rolling_3mo");
  const { data: rolling6mo } = useExitSurveyTrends("rolling_6mo");
  const { data: rolling12mo } = useExitSurveyTrends("rolling_12mo");

  function getRollingScore(
    data: typeof rolling30,
    questionId: string
  ): number | null {
    const row = (data || []).find((t) => t.question_id === questionId);
    return row?.avg_score ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Category toggle pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const active = selectedCategories.includes(cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => toggleCategory(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "text-white border-transparent"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
              style={active ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
            >
              {cat.key}
            </button>
          );
        })}
      </div>

      {/* Line chart */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Monthly Category Averages</h3>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            No trend data yet. Trends are populated after submissions are imported.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => {
                  // "2024-08" → "Aug '24"
                  const [y, m] = v.split("-");
                  if (!y || !m) return v;
                  const d = new Date(parseInt(y), parseInt(m) - 1);
                  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
                }}
              />
              <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} tickCount={5} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  typeof value === "number" ? value.toFixed(2) : value,
                  name,
                ]}
              />
              <Legend />
              {CATEGORIES.filter((c) => selectedCategories.includes(c.key)).map((cat) => (
                <Line
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  stroke={cat.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rolling averages table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b">
          <h3 className="text-sm font-semibold">Rolling Averages by Question</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Question</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Last 30d</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">3 Mo</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">6 Mo</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">12 Mo</th>
              </tr>
            </thead>
            <tbody>
              {scoredQuestions.map((q) => (
                <tr key={q.id} className="border-b hover:bg-muted/10">
                  <td className="px-4 py-2 text-muted-foreground">{q.question_number}</td>
                  <td className="px-4 py-2 text-xs max-w-xs truncate">{q.text}</td>
                  {[rolling30, rolling3mo, rolling6mo, rolling12mo].map((data, i) => {
                    const score = getRollingScore(data, q.id);
                    return (
                      <td key={i} className="px-3 py-2 text-center">
                        <ScoreCell score={score} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color =
    score >= 4.5 ? "text-green-600" : score >= 3.5 ? "text-yellow-600" : "text-red-600";
  return <span className={`text-xs font-semibold ${color}`}>{score.toFixed(2)}</span>;
}

