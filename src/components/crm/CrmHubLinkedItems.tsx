import { Link } from "react-router-dom";
import {
  CheckSquare,
  FolderKanban,
  CalendarDays,
  FileText,
  File,
  Lock,
  ChevronRight,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CrmHubLinkedItems as LinkedItemsData } from "@/hooks/useCrmHubData";
import { useCompanyModules, ENTITY_TO_MODULE_MAP } from "@/hooks/useCompanyModules";
import { format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CrmHubLinkedItemsProps {
  linkedItems: LinkedItemsData;
  counts: {
    tasks: number;
    projects: number;
    events: number;
    notes: number;
    documents: number;
    opportunities: number;
    total: number;
  };
  isLoading: boolean;
  crmClientId: string;
}

interface SectionProps<T> {
  title: string;
  icon: React.ReactNode;
  items: T[];
  totalCount: number;
  viewAllPath: string;
  renderItem: (item: T) => React.ReactNode;
  emptyMessage: string;
  moduleKey: string;
  isEnabled: (key: string) => boolean;
}

function LinkedItemsSection<T extends { id: string }>({
  title,
  icon,
  items,
  totalCount,
  viewAllPath,
  renderItem,
  emptyMessage,
  moduleKey,
  isEnabled,
}: SectionProps<T>) {
  const isModuleEnabled = isEnabled(moduleKey);

  if (!isModuleEnabled) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Module disabled
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {title}
            {totalCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {totalCount}
              </Badge>
            )}
          </CardTitle>
          {totalCount > items.length && (
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link to={viewAllPath}>
                View all
                <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{emptyMessage}</p>
        ) : (
          <div className="space-y-1.5">
            {items.slice(0, 5).map((item) => renderItem(item))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskItem({ task }: { task: any }) {
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== "done";
  const isDone = task.status === "done";

  return (
    <Link
      to={`/app/tasks/${task.id}`}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm"
    >
      <CheckSquare className={cn("h-4 w-4", isDone && "text-muted-foreground")} />
      <span className={cn("flex-1 truncate", isDone && "line-through text-muted-foreground")}>
        {task.name}
      </span>
      {isOverdue && (
        <AlertCircle className="h-3 w-3 text-destructive" />
      )}
      {task.dueDate && !isOverdue && (
        <span className="text-xs text-muted-foreground">
          {format(parseISO(task.dueDate), "MMM d")}
        </span>
      )}
      <Badge
        variant={
          task.priority === "urgent" ? "destructive" :
          task.priority === "high" ? "default" : "secondary"
        }
        className="text-xs"
      >
        {task.priority}
      </Badge>
    </Link>
  );
}

function ProjectItem({ project }: { project: any }) {
  return (
    <Link
      to={`/app/projects/${project.id}`}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm"
    >
      <span className="text-lg">{project.emoji}</span>
      <span className="flex-1 truncate">{project.name}</span>
      <Badge variant="outline" className="text-xs capitalize">
        {project.status.replace("_", " ")}
      </Badge>
    </Link>
  );
}

function EventItem({ event }: { event: any }) {
  const startDate = parseISO(event.startAt);
  const isPastEvent = isPast(startDate);

  return (
    <Link
      to={`/app/calendar/events/${event.id}`}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm"
    >
      <CalendarDays className={cn("h-4 w-4", isPastEvent && "text-muted-foreground")} />
      <span className={cn("flex-1 truncate", isPastEvent && "text-muted-foreground")}>
        {event.name}
      </span>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {format(startDate, event.allDay ? "MMM d" : "MMM d, h:mm a")}
      </span>
    </Link>
  );
}

function NoteItem({ note }: { note: any }) {
  return (
    <Link
      to={`/app/notes/${note.id}`}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm"
    >
      {note.color ? (
        <div
          className="h-4 w-4 rounded-full border"
          style={{ backgroundColor: note.color }}
        />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      <span className="flex-1 truncate">{note.name}</span>
    </Link>
  );
}

function DocumentItem({ document }: { document: any }) {
  return (
    <Link
      to={`/app/documents/${document.id}`}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm"
    >
      <File className="h-4 w-4" />
      <span className="flex-1 truncate">{document.name}</span>
      {document.fileSize && (
        <span className="text-xs text-muted-foreground">
          {formatFileSize(document.fileSize)}
        </span>
      )}
    </Link>
  );
}

function OpportunityItem({ opportunity }: { opportunity: any }) {
  const statusColor = opportunity.status === "won" 
    ? "text-green-600" 
    : opportunity.status === "lost" 
    ? "text-destructive" 
    : "text-blue-600";

  return (
    <Link
      to={`/app/sales/opportunities/${opportunity.id}`}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm"
    >
      <TrendingUp className={cn("h-4 w-4", statusColor)} />
      <span className="flex-1 truncate">{opportunity.name}</span>
      {opportunity.valueAmount != null && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          {opportunity.valueAmount.toLocaleString()}
        </span>
      )}
      <Badge
        variant={
          opportunity.status === "won" ? "default" :
          opportunity.status === "lost" ? "destructive" : "secondary"
        }
        className="text-xs capitalize"
      >
        {opportunity.stageName || opportunity.status}
      </Badge>
    </Link>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CrmHubLinkedItems({
  linkedItems,
  counts,
  isLoading,
  crmClientId,
}: CrmHubLinkedItemsProps) {
  const { isEnabled } = useCompanyModules();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <LinkedItemsSection
        title="Tasks"
        icon={<CheckSquare className="h-4 w-4" />}
        items={linkedItems.tasks}
        totalCount={counts.tasks}
        viewAllPath={`/app/tasks?crm=${crmClientId}`}
        renderItem={(item) => <TaskItem key={item.id} task={item} />}
        emptyMessage="No linked tasks yet"
        moduleKey="tasks"
        isEnabled={isEnabled}
      />

      <LinkedItemsSection
        title="Projects"
        icon={<FolderKanban className="h-4 w-4" />}
        items={linkedItems.projects}
        totalCount={counts.projects}
        viewAllPath={`/app/projects?crm=${crmClientId}`}
        renderItem={(item) => <ProjectItem key={item.id} project={item} />}
        emptyMessage="No linked projects yet"
        moduleKey="projects"
        isEnabled={isEnabled}
      />

      <LinkedItemsSection
        title="Calendar Events"
        icon={<CalendarDays className="h-4 w-4" />}
        items={linkedItems.events}
        totalCount={counts.events}
        viewAllPath={`/app/calendar?crm=${crmClientId}`}
        renderItem={(item) => <EventItem key={item.id} event={item} />}
        emptyMessage="No linked events yet"
        moduleKey="calendar"
        isEnabled={isEnabled}
      />

      <LinkedItemsSection
        title="Notes"
        icon={<FileText className="h-4 w-4" />}
        items={linkedItems.notes}
        totalCount={counts.notes}
        viewAllPath={`/app/notes?crm=${crmClientId}`}
        renderItem={(item) => <NoteItem key={item.id} note={item} />}
        emptyMessage="No linked notes yet"
        moduleKey="notes"
        isEnabled={isEnabled}
      />

      <LinkedItemsSection
        title="Documents"
        icon={<File className="h-4 w-4" />}
        items={linkedItems.documents}
        totalCount={counts.documents}
        viewAllPath={`/app/documents?crm=${crmClientId}`}
        renderItem={(item) => <DocumentItem key={item.id} document={item} />}
        emptyMessage="No linked documents yet"
        moduleKey="documents"
        isEnabled={isEnabled}
      />

      <LinkedItemsSection
        title="Sales Opportunities"
        icon={<TrendingUp className="h-4 w-4" />}
        items={linkedItems.opportunities}
        totalCount={counts.opportunities}
        viewAllPath={`/app/sales/pipelines?crm=${crmClientId}`}
        renderItem={(item) => <OpportunityItem key={item.id} opportunity={item} />}
        emptyMessage="No sales opportunities yet"
        moduleKey="sales"
        isEnabled={isEnabled}
      />
    </div>
  );
}
