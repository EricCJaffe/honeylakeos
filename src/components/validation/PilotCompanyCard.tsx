import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PilotCompany,
  getScoreBand,
  getScoreColor,
  getScoreBgColor,
} from "@/hooks/usePilotValidation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Activity,
  MessageSquare,
  ChevronRight,
  Flag,
  AlertTriangle,
} from "lucide-react";

interface PilotCompanyCardProps {
  pilot: PilotCompany;
  onViewDetails: (companyId: string) => void;
  onEndPilot?: (companyId: string) => void;
}

export function PilotCompanyCard({ pilot, onViewDetails, onEndPilot }: PilotCompanyCardProps) {
  const stats = pilot.stats;
  const score = stats?.activation_score ?? 0;
  const band = getScoreBand(score);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{pilot.company?.name ?? "Unknown Company"}</CardTitle>
            <CardDescription className="text-xs">
              Started {formatDistanceToNow(new Date(pilot.started_at), { addSuffix: true })}
              {pilot.cohort_name && ` • ${pilot.cohort_name}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "text-2xl font-bold tabular-nums",
                getScoreColor(score)
              )}
            >
              {score}
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                band === "green" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                band === "yellow" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                band === "red" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {band === "green" ? "Healthy" : band === "yellow" ? "Moderate" : "At Risk"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Score Progress */}
        <Progress value={score} className="h-1.5" />

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{stats?.active_users_7d ?? 0} active</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>
              {stats?.last_activity
                ? formatDistanceToNow(new Date(stats.last_activity), { addSuffix: true })
                : "No activity"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>{stats?.feedback_count ?? 0} feedback</span>
            {(stats?.open_feedback_count ?? 0) > 0 && (
              <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                {stats?.open_feedback_count}
              </Badge>
            )}
          </div>
        </div>

        {/* Milestones */}
        {stats?.milestones_achieved && stats.milestones_achieved.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {stats.milestones_achieved.slice(0, 5).map((milestone) => (
              <Badge key={milestone} variant="outline" className="text-xs">
                {formatMilestone(milestone)}
              </Badge>
            ))}
            {stats.milestones_achieved.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{stats.milestones_achieved.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            onClick={() => onViewDetails(pilot.company_id)}
            className="flex-1"
          >
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          {onEndPilot && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEndPilot(pilot.company_id)}
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatMilestone(key: string): string {
  const labels: Record<string, string> = {
    invited_user_accepted: "User Invited",
    created_first_task: "First Task",
    created_first_task_list: "Task List",
    created_first_project: "First Project",
    created_first_note_or_doc: "Note/Doc",
    created_first_crm_record: "CRM Record",
    ran_first_report: "Report Run",
    enabled_framework: "Framework",
    completed_onboarding_checklist: "Onboarding",
  };
  return labels[key] || key.replace(/_/g, " ");
}
