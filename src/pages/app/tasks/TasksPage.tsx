import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Repeat, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TaskList } from "./TaskList";
import { TaskFormDialog } from "./TaskFormDialog";

export default function TasksPage() {
  const { activeCompanyId, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, emoji")
        .eq("company_id", activeCompanyId)
        .eq("is_template", false)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: allTasks = [], isLoading: loadingAll } = useQuery({
    queryKey: ["tasks", activeCompanyId, projectFilter],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("tasks")
        .select(`*, task_assignees(user_id), project:projects(id, name, emoji), phase:project_phases(id, name)`)
        .eq("company_id", activeCompanyId)
        .eq("is_recurring_template", false)
        .is("parent_recurring_task_id", null)
        .order("order_index", { ascending: true });
      if (projectFilter !== "all") query = query.eq("project_id", projectFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ["my-tasks", activeCompanyId, user?.id, projectFilter],
    queryFn: async () => {
      if (!activeCompanyId || !user) return [];
      const { data: assignments } = await supabase.from("task_assignees").select("task_id").eq("user_id", user.id);
      const taskIds = assignments?.map((a) => a.task_id) || [];
      if (taskIds.length === 0) return [];
      let query = supabase
        .from("tasks")
        .select(`*, task_assignees(user_id), project:projects(id, name, emoji), phase:project_phases(id, name)`)
        .in("id", taskIds)
        .eq("company_id", activeCompanyId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (projectFilter !== "all") query = query.eq("project_id", projectFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && !!user,
  });

  const { data: recurringTasks = [] } = useQuery({
    queryKey: ["recurring-tasks", activeCompanyId, projectFilter],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("tasks")
        .select(`*, task_assignees(user_id), project:projects(id, name, emoji), phase:project_phases(id, name)`)
        .eq("company_id", activeCompanyId)
        .eq("is_recurring_template", true)
        .order("created_at", { ascending: false });
      if (projectFilter !== "all") query = query.eq("project_id", projectFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const handleCreate = () => { setEditingTask(null); setIsDialogOpen(true); };
  const handleEdit = (task: any) => { setEditingTask(task); setIsDialogOpen(true); };

  if (membershipLoading || loadingAll) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-64 bg-muted rounded-lg" /></div></div>;
  }

  if (!activeCompanyId) {
    return <div className="p-6"><EmptyState icon={CheckCircle2} title="No company selected" description="Please select a company to view tasks." /></div>;
  }

  return (
    <div className="p-6">
      <PageHeader title="Tasks" description="Manage your tasks and assignments" actionLabel="New Task" onAction={handleCreate} />
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.emoji} {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {projectFilter !== "all" && <Badge variant="secondary" className="cursor-pointer" onClick={() => setProjectFilter("all")}>Clear</Badge>}
      </div>
      <Tabs defaultValue="my" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my">My Tasks ({myTasks.length})</TabsTrigger>
          <TabsTrigger value="all">All Tasks ({allTasks.length})</TabsTrigger>
          <TabsTrigger value="recurring" className="gap-1"><Repeat className="h-3.5 w-3.5" />Recurring ({recurringTasks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="my"><Card><CardContent className="p-0">{myTasks.length === 0 ? <div className="py-12"><EmptyState icon={CheckCircle2} title="No tasks assigned" description="Tasks assigned to you will appear here." /></div> : <TaskList tasks={myTasks} onEditTask={handleEdit} showProject showPhase />}</CardContent></Card></TabsContent>
        <TabsContent value="all"><Card><CardContent className="p-0">{allTasks.length === 0 ? <div className="py-12"><EmptyState icon={CheckCircle2} title="No tasks yet" description="Create your first task." actionLabel="Create Task" onAction={handleCreate} /></div> : <TaskList tasks={allTasks} onEditTask={handleEdit} showProject showPhase />}</CardContent></Card></TabsContent>
        <TabsContent value="recurring"><Card><CardContent className="p-0">{recurringTasks.length === 0 ? <div className="py-12"><EmptyState icon={Repeat} title="No recurring tasks" description="Create a recurring task." actionLabel="Create Recurring Task" onAction={handleCreate} /></div> : <TaskList tasks={recurringTasks} onEditTask={handleEdit} showProject showPhase showRecurrence />}</CardContent></Card></TabsContent>
      </Tabs>
      <TaskFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} task={editingTask} />
    </div>
  );
}