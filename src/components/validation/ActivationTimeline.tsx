import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivationEvent, useActivationEvents } from "@/hooks/usePilotValidation";
import { formatDistanceToNow, format } from "date-fns";
import {
  CheckCircle2,
  UserPlus,
  ListTodo,
  FolderKanban,
  FileText,
  Users,
  BarChart3,
  Compass,
  Award,
} from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";

interface ActivationTimelineProps {
  companyId: string;
}

const EVENT_ICONS: Record<string, typeof CheckCircle2> = {
  invited_user_accepted: UserPlus,
  created_first_task: CheckCircle2,
  created_first_task_list: ListTodo,
  created_first_project: FolderKanban,
  created_first_note_or_doc: FileText,
  created_first_crm_record: Users,
  ran_first_report: BarChart3,
  enabled_framework: Compass,
  completed_onboarding_checklist: Award,
};

const EVENT_LABELS: Record<string, string> = {
  invited_user_accepted: "User Accepted Invite",
  created_first_task: "Created First Task",
  created_first_task_list: "Created First Task List",
  created_first_project: "Created First Project",
  created_first_note_or_doc: "Created First Note or Document",
  created_first_crm_record: "Created First CRM Record",
  ran_first_report: "Ran First Report",
  enabled_framework: "Enabled Framework",
  completed_onboarding_checklist: "Completed Onboarding Checklist",
};

const EVENT_COLORS: Record<string, string> = {
  invited_user_accepted: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  created_first_task: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  created_first_task_list: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  created_first_project: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  created_first_note_or_doc: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  created_first_crm_record: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  ran_first_report: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  enabled_framework: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed_onboarding_checklist: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function ActivationTimeline({ companyId }: ActivationTimelineProps) {
  const { data: events, isLoading } = useActivationEvents(companyId);

  if (isLoading) {
    return <ListSkeleton count={5} />;
  }

  if (!events?.length) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No activation events recorded yet.
        </CardContent>
      </Card>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce<Record<string, ActivationEvent[]>>((acc, event) => {
    const dateKey = format(new Date(event.occurred_at), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activation Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(dateKey), "d")}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                    </Badge>
                  </div>

                  <div className="ml-12 space-y-2">
                    {dayEvents.map((event) => {
                      const Icon = EVENT_ICONS[event.event_key] || CheckCircle2;
                      const colorClass = EVENT_COLORS[event.event_key] || "bg-muted text-muted-foreground";

                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className={`p-1.5 rounded-full ${colorClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {EVENT_LABELS[event.event_key] || event.event_key}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.occurred_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
