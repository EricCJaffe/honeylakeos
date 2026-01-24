import { useState } from "react";
import { ExternalLink, Clock, AlertCircle, CheckCircle2, Plus, MoreVertical, XCircle } from "lucide-react";
import { format, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCoachingResourceAssignments,
  useCoachingAssignmentMutations,
} from "@/hooks/useCoachingResources";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import { AssignResourceDialog } from "./AssignResourceDialog";

interface CoachResourceAssignmentsWidgetProps {
  engagementId?: string;
}

export function CoachResourceAssignmentsWidget({ engagementId }: CoachResourceAssignmentsWidgetProps) {
  const { activeCoachingOrgId } = useCoachingRole();
  const { data: assignments, isLoading } = useCoachingResourceAssignments({
    coachingOrgId: activeCoachingOrgId,
    engagementId,
  });
  const { updateAssignment, cancelAssignment } = useCoachingAssignmentMutations();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resource Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const overdueAssignments = assignments?.filter(
    (a) => a.status === "assigned" && a.due_at && isPast(new Date(a.due_at))
  ) || [];

  const pendingAssignments = assignments?.filter(
    (a) => a.status === "assigned" && (!a.due_at || !isPast(new Date(a.due_at)))
  ) || [];

  const completedAssignments = assignments?.filter((a) => a.status === "completed") || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Resource Assignments</CardTitle>
              <CardDescription>
                {overdueAssignments.length > 0 && (
                  <span className="text-destructive">
                    {overdueAssignments.length} overdue ·{" "}
                  </span>
                )}
                {pendingAssignments.length} pending · {completedAssignments.length} completed
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Assign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignments?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No resources assigned yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setAssignDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Assign First Resource
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Overdue */}
              {overdueAssignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  isOverdue
                  onMarkComplete={() =>
                    updateAssignment.mutate({ id: assignment.id, status: "completed" })
                  }
                  onCancel={() => cancelAssignment.mutate(assignment.id)}
                />
              ))}

              {/* Pending */}
              {pendingAssignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  onMarkComplete={() =>
                    updateAssignment.mutate({ id: assignment.id, status: "completed" })
                  }
                  onCancel={() => cancelAssignment.mutate(assignment.id)}
                />
              ))}

              {/* Completed (last 5) */}
              {completedAssignments.length > 0 && (
                <div className="pt-2 border-t mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Recently Completed</p>
                  {completedAssignments.slice(0, 5).map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between py-2 opacity-60"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm line-through">
                          {assignment.title_override ||
                            assignment.resource?.title ||
                            assignment.collection?.name}
                        </span>
                      </div>
                      {assignment.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(assignment.completed_at), "MMM d")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignResourceDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        engagementId={engagementId}
      />
    </>
  );
}

interface AssignmentRowProps {
  assignment: any;
  isOverdue?: boolean;
  onMarkComplete: () => void;
  onCancel: () => void;
}

function AssignmentRow({ assignment, isOverdue, onMarkComplete, onCancel }: AssignmentRowProps) {
  const title =
    assignment.title_override ||
    assignment.resource?.title ||
    assignment.collection?.name ||
    "Untitled";
  const url = assignment.resource?.url;

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg border ${
        isOverdue ? "border-destructive/50 bg-destructive/5" : ""
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isOverdue ? (
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {assignment.due_at && (
            <p
              className={`text-xs ${
                isOverdue ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              Due {format(new Date(assignment.due_at), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {assignment.assignable_type === "collection" && (
          <Badge variant="outline" className="text-xs">
            Collection
          </Badge>
        )}

        {url && (
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMarkComplete}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Complete
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onCancel}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
