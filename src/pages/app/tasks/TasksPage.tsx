import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TaskList } from "./TaskList";
import { TaskFormDialog } from "./TaskFormDialog";

export default function TasksPage() {
  const { activeCompanyId, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // All tasks for the company
  const { data: allTasks = [], isLoading: loadingAll } = useQuery({
    queryKey: ["tasks", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          task_assignees(user_id),
          project:projects(id, name, emoji)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_recurring_template", false)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  // My tasks (assigned to me)
  const { data: myTasks = [], isLoading: loadingMy } = useQuery({
    queryKey: ["my-tasks", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user) return [];
      
      // First get task IDs where user is assigned
      const { data: assignments, error: assignError } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", user.id);

      if (assignError) throw assignError;
      
      const taskIds = assignments?.map((a) => a.task_id) || [];
      if (taskIds.length === 0) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          task_assignees(user_id),
          project:projects(id, name, emoji)
        `)
        .in("id", taskIds)
        .eq("company_id", activeCompanyId)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && !!user,
  });

  const handleCreate = () => {
    setEditingTask(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  if (membershipLoading || loadingAll) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={CheckCircle2}
          title="No company selected"
          description="Please select a company to view tasks."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Tasks"
        description="Manage your tasks and assignments"
        actionLabel="New Task"
        onAction={handleCreate}
      />

      <Tabs defaultValue="my" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my">My Tasks ({myTasks.length})</TabsTrigger>
          <TabsTrigger value="all">All Tasks ({allTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my">
          <Card>
            <CardContent className="p-0">
              {myTasks.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={CheckCircle2}
                    title="No tasks assigned to you"
                    description="Tasks assigned to you will appear here."
                  />
                </div>
              ) : (
                <TaskList
                  tasks={myTasks}
                  onEditTask={handleEdit}
                  showProject
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {allTasks.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={CheckCircle2}
                    title="No tasks yet"
                    description="Create your first task to get started."
                    actionLabel="Create Task"
                    onAction={handleCreate}
                  />
                </div>
              ) : (
                <TaskList
                  tasks={allTasks}
                  onEditTask={handleEdit}
                  showProject
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        task={editingTask}
      />
    </div>
  );
}
