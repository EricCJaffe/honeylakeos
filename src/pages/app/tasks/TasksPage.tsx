import * as React from "react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Repeat, Filter, FileText, Layers, List, Settings, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useTaskLists } from "@/hooks/useTaskLists";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TaskList } from "./TaskList";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskTemplateList } from "@/components/tasks/TaskTemplateList";
import { TemplateFormDialog } from "@/components/templates/TemplateFormDialog";
import { TaskListManager } from "@/components/tasks/TaskListManager";
import { Template } from "@/hooks/useTemplates";
import { ensureArray } from "@/core/runtime/safety";

export default function TasksPage() {
  const navigate = useNavigate();
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const { taskLists, personalLists, companyLists, unlistedCount } = useTaskLists();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [listFilter, setListFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateToApply, setTemplateToApply] = useState<Template | null>(null);
  const [listManagerOpen, setListManagerOpen] = useState(false);

  const { data: projectsRaw = [] } = useQuery({
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

  // Fetch phases for selected project
  const { data: phasesRaw = [] } = useQuery({
    queryKey: ["project-phases", projectFilter],
    queryFn: async () => {
      if (!projectFilter || projectFilter === "all") return [];
      const { data, error } = await supabase
        .from("project_phases")
        .select("id, name")
        .eq("project_id", projectFilter)
        .eq("status", "active")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: projectFilter !== "all",
  });

  // Reset phase filter when project changes
  React.useEffect(() => {
    setPhaseFilter("all");
  }, [projectFilter]);

  const { data: allTasksRaw = [], isLoading: loadingAll } = useQuery({
    queryKey: ["tasks", activeCompanyId, projectFilter, phaseFilter, listFilter],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("tasks")
        .select(`*, task_assignees(user_id), project:projects(id, name, emoji), phase:project_phases(id, name), task_list:task_lists(id, name, color)`)
        .eq("company_id", activeCompanyId)
        .eq("is_recurring_template", false)
        .is("parent_recurring_task_id", null)
        .order("is_pinned", { ascending: false })
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("order_index", { ascending: true });
      if (projectFilter !== "all") query = query.eq("project_id", projectFilter);
      if (phaseFilter !== "all") query = query.eq("phase_id", phaseFilter);
      if (listFilter === "unlisted") {
        query = query.is("list_id", null);
      } else if (listFilter !== "all") {
        query = query.eq("list_id", listFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: myTasksRaw = [] } = useQuery({
    queryKey: ["my-tasks", activeCompanyId, user?.id, projectFilter, phaseFilter, listFilter],
    queryFn: async () => {
      if (!activeCompanyId || !user) return [];
      const { data: assignments } = await supabase.from("task_assignees").select("task_id").eq("user_id", user.id);
      const taskIds = assignments?.map((a) => a.task_id) || [];
      if (taskIds.length === 0) return [];
      let query = supabase
        .from("tasks")
        .select(`*, task_assignees(user_id), project:projects(id, name, emoji), phase:project_phases(id, name), task_list:task_lists(id, name, color)`)
        .in("id", taskIds)
        .eq("company_id", activeCompanyId)
        .order("is_pinned", { ascending: false })
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("due_date", { ascending: true, nullsFirst: false });
      if (projectFilter !== "all") query = query.eq("project_id", projectFilter);
      if (phaseFilter !== "all") query = query.eq("phase_id", phaseFilter);
      if (listFilter === "unlisted") {
        query = query.is("list_id", null);
      } else if (listFilter !== "all") {
        query = query.eq("list_id", listFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && !!user,
  });

  const { data: recurringTasksRaw = [] } = useQuery({
    queryKey: ["recurring-tasks", activeCompanyId, projectFilter, phaseFilter, listFilter],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("tasks")
        .select(`*, task_assignees(user_id), project:projects(id, name, emoji), phase:project_phases(id, name), task_list:task_lists(id, name, color)`)
        .eq("company_id", activeCompanyId)
        .eq("is_recurring_template", true)
        .order("is_pinned", { ascending: false })
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (projectFilter !== "all") query = query.eq("project_id", projectFilter);
      if (phaseFilter !== "all") query = query.eq("phase_id", phaseFilter);
      if (listFilter === "unlisted") {
        query = query.is("list_id", null);
      } else if (listFilter !== "all") {
        query = query.eq("list_id", listFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const handleCreate = () => {
    setEditingTask(null);
    setTemplateToApply(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setTemplateToApply(null);
    setIsDialogOpen(true);
  };

  const handleCreateFromTemplate = (template: Template) => {
    setEditingTask(null);
    setTemplateToApply(template);
    setIsDialogOpen(true);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const clearFilters = () => {
    setProjectFilter("all");
    setPhaseFilter("all");
    setListFilter("all");
    setTagFilter("all");
    setSearchQuery("");
  };

  const hasFilters = projectFilter !== "all" || phaseFilter !== "all" || listFilter !== "all" || tagFilter !== "all" || searchQuery !== "";

  const projects = ensureArray<{ id: string; name: string; emoji: string | null }>(projectsRaw);
  const phases = ensureArray<{ id: string; name: string }>(phasesRaw);
  const allTasks = ensureArray<any>(allTasksRaw);
  const myTasks = ensureArray<any>(myTasksRaw);
  const recurringTasks = ensureArray<any>(recurringTasksRaw);

  // Extract unique tags from all tasks
  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    const safeAllTasks = ensureArray<any>(allTasks);
    const safeMyTasks = ensureArray<any>(myTasks);
    const safeRecurringTasks = ensureArray<any>(recurringTasks);

    [...safeAllTasks, ...safeMyTasks, ...safeRecurringTasks].forEach((task) => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [allTasks, myTasks, recurringTasks]);

  // Filter function for tags and search
  const filterTasks = (tasks: any[]) => {
    const safeTasks = ensureArray<any>(tasks);
    return safeTasks.filter((task) => {
      // Tag filter
      if (tagFilter !== "all") {
        const taskTags = Array.isArray(task.tags) ? task.tags : [];
        if (!taskTags.includes(tagFilter)) return false;
      }
      // Search filter (searches title and tags)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(query);
        const taskTags = Array.isArray(task.tags) ? task.tags : [];
        const tagMatch = taskTags.some((t: string) => t.toLowerCase().includes(query));
        if (!titleMatch && !tagMatch) return false;
      }
      return true;
    });
  };

  const filteredAllTasks = useMemo(() => filterTasks(allTasks), [allTasks, tagFilter, searchQuery]);
  const filteredMyTasks = useMemo(() => filterTasks(myTasks), [myTasks, tagFilter, searchQuery]);
  const filteredRecurringTasks = useMemo(() => filterTasks(recurringTasks), [recurringTasks, tagFilter, searchQuery]);

  if (membershipLoading || loadingAll) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-64 bg-muted rounded-lg" /></div></div>;
  }

  if (!activeCompanyId) {
    return <div className="p-6"><EmptyState icon={CheckCircle2} title="No company selected" description="Please select a company to view tasks." /></div>;
  }

  return (
    <div className="p-6">
      <PageHeader title="Tasks" description="Manage your tasks and assignments" actionLabel="New Task" onAction={handleCreate} />
      
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        {/* List filter */}
        <Select value={listFilter} onValueChange={setListFilter}>
          <SelectTrigger className="w-[180px]">
            <List className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by list" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lists</SelectItem>
            <SelectItem value="unlisted">
              <div className="flex items-center gap-2">
                No List
                {unlistedCount > 0 && (
                  <span className="text-xs text-muted-foreground">({unlistedCount})</span>
                )}
              </div>
            </SelectItem>
            {personalLists && personalLists.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Personal</div>
                {personalLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    <div className="flex items-center gap-2">
                      {list.color && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                      )}
                      {list.name}
                      <span className="text-xs text-muted-foreground">({list.task_count})</span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
            {companyLists && companyLists.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Company</div>
                {companyLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    <div className="flex items-center gap-2">
                      {list.color && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                      )}
                      {list.name}
                      <span className="text-xs text-muted-foreground">({list.task_count})</span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        {/* Project filter */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.emoji} {p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Phase filter */}
        {projectFilter !== "all" && phases.length > 0 && (
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[180px]">
              <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Tag filter */}
        {uniqueTags.length > 0 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[160px]">
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {uniqueTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[180px] pl-3"
          />
        </div>

        {hasFilters && (
          <Badge variant="secondary" className="cursor-pointer" onClick={clearFilters}>
            Clear filters
          </Badge>
        )}

        {/* Manage Lists button */}
        {isCompanyAdmin && (
          <Button variant="outline" size="sm" onClick={() => setListManagerOpen(true)} className="ml-auto">
            <Settings className="h-4 w-4 mr-2" />
            Manage Lists
          </Button>
        )}
      </div>

      <Tabs defaultValue="my" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my">My Tasks ({filteredMyTasks.length})</TabsTrigger>
          <TabsTrigger value="all">All Tasks ({filteredAllTasks.length})</TabsTrigger>
          <TabsTrigger value="recurring" className="gap-1"><Repeat className="h-3.5 w-3.5" />Recurring ({filteredRecurringTasks.length})</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1"><FileText className="h-3.5 w-3.5" />Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="my">
          <Card>
            <CardContent className="p-0">
              {filteredMyTasks.length === 0 ? (
                <div className="py-12">
                  <EmptyState 
                    icon={CheckCircle2} 
                    title={hasFilters ? "No matching tasks" : "No tasks assigned"}
                    description={hasFilters ? "Try adjusting your filters." : "Tasks assigned to you will appear here."}
                    actionLabel={!hasFilters ? "Create Task" : undefined}
                    onAction={!hasFilters ? handleCreate : undefined}
                  />
                </div>
              ) : (
                <TaskList tasks={filteredMyTasks} onEditTask={handleEdit} showProject showPhase showList />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {filteredAllTasks.length === 0 ? (
                <div className="py-12">
                  <EmptyState 
                    icon={CheckCircle2} 
                    title={hasFilters ? "No matching tasks" : "No tasks yet"}
                    description={hasFilters ? "Try adjusting your filters." : "Create your first task to get started."}
                    actionLabel={!hasFilters ? "Create Task" : undefined}
                    onAction={!hasFilters ? handleCreate : undefined}
                  />
                </div>
              ) : (
                <TaskList tasks={filteredAllTasks} onEditTask={handleEdit} showProject showPhase showList />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recurring">
          <Card>
            <CardContent className="p-0">
              {filteredRecurringTasks.length === 0 ? (
                <div className="py-12">
                  <EmptyState 
                    icon={Repeat} 
                    title={hasFilters ? "No matching recurring tasks" : "No recurring tasks"}
                    description={hasFilters ? "Try adjusting your filters." : "Create a recurring task to automate repetitive work."}
                    actionLabel={!hasFilters ? "Create Recurring Task" : undefined}
                    onAction={!hasFilters ? handleCreate : undefined}
                  />
                </div>
              ) : (
                <TaskList tasks={filteredRecurringTasks} onEditTask={handleEdit} showProject showPhase showRecurrence showList />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="templates">
          <Card>
            <CardContent className="p-0">
              <TaskTemplateList
                onCreateFromTemplate={handleCreateFromTemplate}
                onEditTemplate={handleEditTemplate}
                onCreateTemplate={handleCreateTemplate}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        task={editingTask}
        templateToApply={templateToApply}
        onSuccess={(taskId) => {
          if (!editingTask) {
            navigate(`/app/tasks/${taskId}`);
          }
        }}
      />
      <TemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate}
        defaultType="task"
      />
      <TaskListManager
        open={listManagerOpen}
        onOpenChange={setListManagerOpen}
      />
    </div>
  );
}
