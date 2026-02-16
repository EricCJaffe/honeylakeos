import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  FolderKanban, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  LayoutGrid, 
  LayoutList,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  ChevronDown,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectTemplateList } from "@/components/projects/ProjectTemplateList";
import { ProjectTemplateFormDialog } from "@/components/projects/ProjectTemplateFormDialog";
import { CreateFromTemplateDialog } from "@/components/projects/CreateFromTemplateDialog";
import { TemplatePickerDialog } from "@/components/projects/TemplatePickerDialog";
import { useProjectTemplates, type ProjectTemplate } from "@/hooks/useProjectTemplates";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Project = Tables<"projects">;
type LinkedClient = {
  id: string;
  name?: string | null;
  org_name?: string | null;
  person_full_name?: string | null;
};
type ProjectWithClient = Project & { linked_crm_client: LinkedClient | null };

const getClientDisplayName = (client: LinkedClient | null | undefined) =>
  client?.org_name || client?.person_full_name || client?.name || "Unnamed client";

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message ?? "Unknown error");
  }
  return String(error);
};

export default function ProjectsPage() {
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [templateToUse, setTemplateToUse] = useState<ProjectTemplate | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  
  // View and filter state
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch templates for "New from Template"
  const { data: templates = [] } = useProjectTemplates();

  const {
    data: projects = [],
    isLoading,
    error: projectsError,
  } = useQuery<ProjectWithClient[]>({
    queryKey: ["projects", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      // Pull projects; CRM client linking is stored in entity_links, but we should NOT
      // filter the project list by presence of a link (otherwise projects without links disappear).
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("is_template", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch project→crm_client links separately.
      // NOTE: entity_links.to_id is a polymorphic pointer (no FK), so PostgREST
      // cannot join to crm_clients. We fetch links and then fetch clients by id.
      const { data: links, error: linksError } = await supabase
        .from("entity_links")
        .select("from_id,to_id")
        .eq("company_id", activeCompanyId)
        .eq("from_type", "project")
        .eq("to_type", "crm_client");

      if (linksError) throw linksError;

      const clientIds = Array.from(new Set((links || []).map((l) => l.to_id).filter(Boolean)));
      let clientById = new Map<string, LinkedClient>();
      if (clientIds.length) {
        const { data: clients, error: clientsError } = await supabase
          .from("crm_clients")
          .select("*")
          .eq("company_id", activeCompanyId)
          .in("id", clientIds);
        if (clientsError) throw clientsError;
        clientById = new Map((clients || []).map((c) => [c.id, c as LinkedClient]));
      }

      const byProject = new Map<string, LinkedClient>();
      for (const l of links || []) {
        if (!l?.from_id || !l?.to_id) continue;
        const client = clientById.get(l.to_id);
        if (!client) continue;
        byProject.set(l.from_id, client);
      }

      // IMPORTANT: keep this as an ARRAY. Other routes reuse the same query key
      // and expect a list they can call `.map()` on.
	      const baseProjects = (data ?? []) as Project[];
	      return baseProjects.map((p) => ({
	        ...p,
	        linked_crm_client: byProject.get(p.id) || null,
	      }));
    },
    enabled: !!activeCompanyId,
  });

  // Fetch ALL CRM clients for the company (for filter dropdown)
  const { data: allClients = [] } = useQuery({
    queryKey: ["crm-clients-for-filter", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("crm_clients")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LinkedClient[];
    },
    enabled: !!activeCompanyId,
  });

  // Fetch tasks linked to active projects for KPIs
  const { data: projectTasks = [], error: projectTasksError } = useQuery({
    queryKey: ["projects-tasks-kpi", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, status, due_date, project_id")
        .eq("company_id", activeCompanyId)
        .not("project_id", "is", null);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  // Fetch current phases for projects
  const { data: projectPhases = [], error: projectPhasesError } = useQuery({
    queryKey: ["projects-phases", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("project_phases")
        .select("id, name, project_id, status")
        .eq("company_id", activeCompanyId);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from("projects")
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id 
        })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project moved to trash");
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleProjectCreated = (projectId: string) => {
    navigate(`/app/projects/${projectId}`);
  };

  const canEdit = (project: Project) => {
    return isCompanyAdmin || project.owner_user_id === user?.id;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // KPI calculations
  const activeProjectIds = useMemo(() => 
    projects.filter(p => p.status === "active").map(p => p.id),
    [projects]
  );

  const kpis = useMemo(() => {
    const activeCount = projects.filter(p => p.status === "active").length;
    const completedCount = projects.filter(p => p.status === "completed").length;
    
    const tasksInActiveProjects = projectTasks.filter(t => 
      activeProjectIds.includes(t.project_id!)
    );
    const totalLinkedTasks = tasksInActiveProjects.length;
    
    const now = new Date();
    const overdueTasks = tasksInActiveProjects.filter(t => 
      t.status !== "done" && t.due_date && new Date(t.due_date) < now
    ).length;

    return { activeCount, completedCount, totalLinkedTasks, overdueTasks };
  }, [projects, projectTasks, activeProjectIds]);

  // Get current phase for a project
  const getCurrentPhase = (projectId: string) => {
    const phases = projectPhases.filter(p => p.project_id === projectId);
    const activePhase = phases.find(p => p.status === "in_progress");
    return activePhase?.name || phases[0]?.name || "—";
  };

  // Calculate task progress for a project
  const getProjectProgress = (projectId: string) => {
    const tasks = projectTasks.filter(t => t.project_id === projectId);
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === "done").length;
    return Math.round((completed / tasks.length) * 100);
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Status filter
      if (statusFilter !== "all" && project.status !== statusFilter) return false;

      // Client filter (linked CRM client)
      if (clientFilter !== "all") {
        const linked = project.linked_crm_client;
        if (!linked || linked.id !== clientFilter) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!project.name.toLowerCase().includes(query) && 
            !(project.description || "").toLowerCase().includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [projects, statusFilter, clientFilter, searchQuery]);

  if (membershipLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FolderKanban}
          title="No company selected"
          description="Please select a company to view projects."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Dropdown Create Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your team's projects</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCreate}>
              <FolderKanban className="h-4 w-4 mr-2" />
              Blank Project
            </DropdownMenuItem>
            {templates.length > 0 && (
              <DropdownMenuItem onClick={() => setShowTemplatePicker(true)}>
                <FileText className="h-4 w-4 mr-2" />
                From Template
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* KPI Summary Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.activeCount}</p>
                <p className="text-xs text-muted-foreground">Active projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.totalLinkedTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks in active projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.overdueTasks}</p>
                <p className="text-xs text-muted-foreground">Overdue tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          {isCompanyAdmin && <TabsTrigger value="templates">Templates</TabsTrigger>}
        </TabsList>

        <TabsContent value="projects">
          {(projectsError || projectTasksError || projectPhasesError) && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <div className="font-semibold text-destructive">Projects data error</div>
              <div className="mt-1 text-xs text-muted-foreground">If you see this, something is failing (RLS/auth/context). Please screenshot this box.</div>
              {projectsError && <div className="mt-2 text-xs"><span className="font-semibold">projects:</span> {getErrorMessage(projectsError)}</div>}
              {projectTasksError && <div className="mt-1 text-xs"><span className="font-semibold">tasks:</span> {getErrorMessage(projectTasksError)}</div>}
              {projectPhasesError && <div className="mt-1 text-xs"><span className="font-semibold">phases:</span> {getErrorMessage(projectPhasesError)}</div>}
              <div className="mt-2 text-xs text-muted-foreground">(Diagnostics banner will be removed once this is stable.)</div>
              <div className="mt-2 text-xs">activeCompanyId: <span className="font-mono">{activeCompanyId || "(null)"}</span></div>
              <div className="mt-1 text-xs">projects loaded: <span className="font-mono">{projects.length}</span></div>
            </div>
          )}

          {/* Filters and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Client filter */}
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {allClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getClientDisplayName(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as "cards" | "table")}
              size="sm"
            >
              <ToggleGroupItem value="cards" aria-label="Card view">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view">
                <LayoutList className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {filteredProjects.length === 0 ? (
            projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create your first project to get started organizing your work."
                actionLabel="Create Project"
                onAction={handleCreate}
              />
            ) : (
              <EmptyState
                icon={FolderKanban}
                title="No matching projects"
                description="Try adjusting your filters or search query."
              />
            )
          ) : viewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Link to={`/app/projects/${project.id}`} className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{project.emoji}</span>
                            <CardTitle className="text-base group-hover:text-primary transition-colors">
                              {project.name}
                            </CardTitle>
                          </div>
                        </Link>
                        {canEdit(project) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.preventDefault()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleEdit(project, e)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteProject.mutate(project.id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <Badge variant="secondary" className={getStatusColor(project.status || "active")}>
                        {(project.status || "active").replace("_", " ")}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {project.description}
                        </p>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{getProjectProgress(project.id)}%</span>
                        </div>
                        <Progress value={getProjectProgress(project.id)} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow 
                      key={project.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{project.emoji}</span>
                          <span className="font-medium">{project.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getCurrentPhase(project.id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(project.status || "active")}>
                          {(project.status || "active").replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={getProjectProgress(project.id)} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground">
                            {getProjectProgress(project.id)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(project.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {canEdit(project) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleEdit(project, e)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteProject.mutate(project.id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {isCompanyAdmin && (
          <TabsContent value="templates">
            <ProjectTemplateList
              onCreate={() => {
                setEditingTemplate(null);
                setTemplateDialogOpen(true);
              }}
              onEdit={(template) => {
                setEditingTemplate(template);
                setTemplateDialogOpen(true);
              }}
              onUseTemplate={(template) => setTemplateToUse(template)}
            />
          </TabsContent>
        )}
      </Tabs>

      <ProjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        project={editingProject}
        onSuccess={!editingProject ? handleProjectCreated : undefined}
      />

      <ProjectTemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate}
      />

      <CreateFromTemplateDialog
        open={!!templateToUse}
        onOpenChange={(open) => !open && setTemplateToUse(null)}
        template={templateToUse}
        onSuccess={(projectId) => navigate(`/app/projects/${projectId}`)}
      />

      <TemplatePickerDialog
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        onSelectTemplate={(template) => {
          setShowTemplatePicker(false);
          setTemplateToUse(template);
        }}
      />
    </div>
  );
}
