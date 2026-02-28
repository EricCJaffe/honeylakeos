import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useExitSurveySubmissions,
  useExitSurveySubmissionDetail,
  useExitSurveySettings,
  type DateFilter,
} from "@/hooks/useExitSurvey";
import { Search, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "6mo", value: "6mo" },
  { label: "12mo", value: "12mo" },
  { label: "All", value: "all" },
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

// ---- Main tab ----

export function SubmissionsTab() {
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const hasLoggedViewRef = useRef(false);
  const searchLoggedTermsRef = useRef<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 20;
  const { data: settings } = useExitSurveySettings();
  const [revealNames, setRevealNames] = useState(false);
  const phiSafeMode = settings?.phi_safe_email_mode === "true";

  const { data, isLoading } = useExitSurveySubmissions({
    dateFilter,
    page,
    pageSize: PAGE_SIZE,
    search,
  });

  const submissions = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => {
    if (hasLoggedViewRef.current) return;
    hasLoggedViewRef.current = true;
    void log("exit_survey.submissions_viewed", "exit_survey_submission", undefined, {
      source: "exit_survey_submissions_tab",
    });
  }, [log]);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    const normalized = val.trim().toLowerCase();
    if (normalized.length >= 2 && !searchLoggedTermsRef.current.has(normalized)) {
      searchLoggedTermsRef.current.add(normalized);
      void log("exit_survey.patient_lookup_searched", "exit_survey_submission", undefined, {
        source: "exit_survey_submissions_tab",
        query_length: normalized.length,
      });
    }
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
                        : phiSafeMode && !revealNames
                          ? <span className="font-medium">Patient {s.id.slice(0, 6)}</span>
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
                        onClick={() => navigate(`/app/exit-survey/submissions/${s.id}`)}
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

    </div>
  );
}
