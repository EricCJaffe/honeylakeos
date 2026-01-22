import { ExternalLink, CheckCircle2, Clock, FileText, Link, Video, File, ClipboardList } from "lucide-react";
import { format, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMyResourceAssignments,
  useResourceProgressMutations,
  getAssignmentStatusLabel,
} from "@/hooks/useCoachingResources";
import type { Database } from "@/integrations/supabase/types";

type ResourceType = Database["public"]["Enums"]["coaching_resource_type"];

const resourceTypeIcons: Record<ResourceType, React.ElementType> = {
  link: Link,
  file: File,
  video: Video,
  document: FileText,
  worksheet: ClipboardList,
};

export function MemberResourcesWidget() {
  const { data: assignments, isLoading } = useMyResourceAssignments();
  const { markViewed, markCompleted } = useResourceProgressMutations();

  const handleViewResource = async (assignmentId: string, url?: string | null) => {
    await markViewed.mutateAsync(assignmentId);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleMarkComplete = async (assignmentId: string) => {
    await markCompleted.mutateAsync(assignmentId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const pendingAssignments = assignments?.filter((a) => a.status === "assigned") || [];
  const completedAssignments = assignments?.filter((a) => a.status === "completed") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Resources
        </CardTitle>
        <CardDescription>
          {pendingAssignments.length} pending · {completedAssignments.length} completed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignments?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No resources assigned yet.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingAssignments.map((assignment) => {
              const resource = assignment.resource;
              const collection = assignment.collection;
              const title = assignment.title_override || resource?.title || collection?.name || "Untitled";
              const url = resource?.url;
              const IconComponent = resource
                ? resourceTypeIcons[resource.resource_type] || File
                : FileText;
              const isOverdue = assignment.due_at && isPast(new Date(assignment.due_at));

              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        isOverdue ? "bg-destructive/10" : "bg-primary/10"
                      }`}
                    >
                      <IconComponent
                        className={`h-4 w-4 ${
                          isOverdue ? "text-destructive" : "text-primary"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {assignment.due_at && (
                          <span className={isOverdue ? "text-destructive" : ""}>
                            <Clock className="inline h-3 w-3 mr-1" />
                            Due {format(new Date(assignment.due_at), "MMM d")}
                          </span>
                        )}
                        <Badge
                          variant={isOverdue ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {getAssignmentStatusLabel(assignment.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResource(assignment.id, url)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkComplete(assignment.id)}
                      disabled={markCompleted.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  </div>
                </div>
              );
            })}

            {completedAssignments.length > 0 && (
              <>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Completed</p>
                </div>
                {completedAssignments.slice(0, 3).map((assignment) => {
                  const resource = assignment.resource;
                  const collection = assignment.collection;
                  const title =
                    assignment.title_override || resource?.title || collection?.name || "Untitled";

                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-2 rounded-lg opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <p className="text-sm line-through">{title}</p>
                      </div>
                      {assignment.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(assignment.completed_at), "MMM d")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
