import { Link } from "react-router-dom";
import {
  CheckSquare,
  FolderKanban,
  CalendarDays,
  FileText,
  File,
  Clock,
  CheckCircle2,
  PlusCircle,
  Edit3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineItem } from "@/hooks/useCrmHubData";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CrmTimelineProps {
  timeline: TimelineItem[];
  isLoading: boolean;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; route: string }> = {
  task: { icon: CheckSquare, color: "text-blue-500", route: "/app/tasks" },
  project: { icon: FolderKanban, color: "text-purple-500", route: "/app/projects" },
  event: { icon: CalendarDays, color: "text-green-500", route: "/app/calendar/events" },
  note: { icon: FileText, color: "text-amber-500", route: "/app/notes" },
  document: { icon: File, color: "text-slate-500", route: "/app/documents" },
};

const actionConfig: Record<string, { icon: React.ElementType; label: string }> = {
  created: { icon: PlusCircle, label: "Created" },
  updated: { icon: Edit3, label: "Updated" },
  completed: { icon: CheckCircle2, label: "Completed" },
  scheduled: { icon: Clock, label: "Scheduled" },
};

function TimelineEntry({ item }: { item: TimelineItem }) {
  const config = typeConfig[item.type] || { icon: File, color: "text-muted-foreground", route: "#" };
  const action = actionConfig[item.action] || actionConfig.created;
  const TypeIcon = config.icon;
  const ActionIcon = action.icon;

  const itemDate = parseISO(item.date);
  const isRecent = Date.now() - itemDate.getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Link
      to={`${config.route}/${item.id}`}
      className="group flex gap-3 py-3 px-2 rounded-lg hover:bg-accent transition-colors"
    >
      {/* Timeline line and icon */}
      <div className="relative flex flex-col items-center">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center bg-muted", config.color)}>
          <TypeIcon className="h-4 w-4" />
        </div>
        {/* Connecting line - hidden for last item via CSS */}
        <div className="w-px bg-border flex-1 min-h-[8px] group-last:hidden" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{item.name}</span>
          <Badge variant="outline" className="text-xs gap-1 shrink-0">
            <ActionIcon className="h-3 w-3" />
            {action.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="capitalize">{item.type}</span>
          <span>•</span>
          <span title={format(itemDate, "PPpp")}>
            {isRecent
              ? formatDistanceToNow(itemDate, { addSuffix: true })
              : format(itemDate, "MMM d, yyyy")}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CrmTimeline({ timeline, isLoading }: CrmTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity yet</p>
            <p className="text-xs mt-1">
              Create tasks, notes, or events to see activity here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Activity Timeline
          <Badge variant="secondary" className="ml-1 text-xs">
            {timeline.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="-mx-2">
          {timeline.map((item) => (
            <TimelineEntry key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
