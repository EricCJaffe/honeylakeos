import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, ExternalLink, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useMembership } from "@/lib/membership";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DepartmentTasksTabProps {
  departmentId: string;
}

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

const statusColors = {
  todo: "secondary",
  in_progress: "default",
  done: "outline",
} as const;

export function DepartmentTasksTab({ departmentId }: DepartmentTasksTabProps) {
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["department-tasks", departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("department_id", departmentId)
        .order("is_pinned", { ascending: false })
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!departmentId,
  });

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate(`/app/tasks/new?department=${departmentId}`)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {!tasks?.length ? (
        <EmptyState
          icon={CheckCircle2}
          title="No tasks in this department"
          description="Create a task and assign it to this department."
          actionLabel="New Task"
          onAction={() => navigate(`/app/tasks/new?department=${departmentId}`)}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const status = (task.status as keyof typeof statusIcons) || "todo";
            const StatusIcon = statusIcons[status] || Circle;

            return (
              <Card key={task.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3" onClick={() => navigate(`/app/tasks/${task.id}`)}>
                    <StatusIcon className={`h-5 w-5 ${status === "done" ? "text-green-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`font-medium ${status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[status] || "secondary"} className="capitalize">
                      {status.replace("_", " ")}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/app/tasks/${task.id}`)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
